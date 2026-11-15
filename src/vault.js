/* ==========================================================
   THE VAULT — Codified Resonance
   One script for every page. window.VAULT is written by build.py:
   { sandbox:bool, formspree:"<form id>" }
   ========================================================== */
(function(){
  'use strict';
  var CFG = window.VAULT || {};
  var $  = function(s, r){ return (r||document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var teardown = [];
  var pointer = { x:-9999, y:-9999 };
  function store(kind){ try{ return window[kind]; }catch(e){ return null; } }
  function sget(kind,k){ try{ return store(kind).getItem(k); }catch(e){ return null; } }
  function sset(kind,k,v){ try{ store(kind).setItem(k,v); }catch(e){} }
  function wait(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }

  /* ---------- aliveness: light follows the pointer, touch leaves a trace ---------- */
  document.addEventListener('pointermove', function(e){
    pointer.x = e.clientX; pointer.y = e.clientY;
    var el = e.target.closest && e.target.closest('.alive,.v-chip,.v-tab');
    if(!el) return;
    var b = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - b.left) + 'px');
    el.style.setProperty('--my', (e.clientY - b.top) + 'px');
  }, { passive:true });
  document.addEventListener('pointerdown', function(e){
    pointer.x = e.clientX; pointer.y = e.clientY;
    var el = e.target.closest && e.target.closest('.alive,.v-chip,.v-glyph');
    if(!el) return;
    var b = el.getBoundingClientRect();
    el.style.setProperty('--mx', (e.clientX - b.left) + 'px');
    el.style.setProperty('--my', (e.clientY - b.top) + 'px');
    el.classList.add('is-touched');
    setTimeout(function(){ el.classList.remove('is-touched'); }, 900);
  }, { passive:true });
  document.addEventListener('pointerleave', function(){ pointer.x = pointer.y = -9999; });

  /* ---------- the lattice: a field that notices you ---------- */
  (function lattice(){
    var c = $('#lattice'); if(!c || !c.getContext) return;
    var ctx = c.getContext('2d'), w = 0, h = 0, dpr = 1, GAP = 46, pts = [], raf = 0, last = 0;
    function size(){
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
      pts = [];
      for(var y = GAP/2; y < h + GAP; y += GAP){ for(var x = GAP/2; x < w + GAP; x += GAP){ pts.push([x, y]); } }
    }
    function draw(t){
      raf = requestAnimationFrame(draw);
      if(t - last < 33) return; last = t;
      if(document.body.classList.contains('paper')) { ctx.clearRect(0,0,w,h); return; }
      ctx.clearRect(0,0,w,h);
      var R = 190, px = pointer.x, py = pointer.y, near = [];
      for(var i = 0; i < pts.length; i++){
        var x = pts[i][0], y = pts[i][1];
        var breath = 0.5 + 0.5 * Math.sin(t/2600 - (x*0.004 + y*0.006));
        var a = 0.035 + breath * 0.05, r = 0.7;
        var dx = x - px, dy = y - py, d = Math.sqrt(dx*dx + dy*dy);
        if(d < R){
          var k = 1 - d / R;
          x += dx / (d || 1) * k * 7; y += dy / (d || 1) * k * 7;
          a += k * 0.55; r += k * 1.1;
          near.push([x, y, k]);
        }
        ctx.fillStyle = 'rgba(120,210,255,' + a.toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
      }
      for(var m = 0; m < near.length; m++){
        for(var n = m + 1; n < near.length; n++){
          var ax = near[m][0] - near[n][0], ay = near[m][1] - near[n][1];
          if(ax*ax + ay*ay < GAP*GAP*2.3){
            ctx.strokeStyle = 'rgba(120,210,255,' + (Math.min(near[m][2], near[n][2]) * 0.3).toFixed(3) + ')';
            ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(near[m][0], near[m][1]); ctx.lineTo(near[n][0], near[n][1]); ctx.stroke();
          }
        }
      }
    }
    size(); window.addEventListener('resize', size);
    if(reduce){ draw(0); cancelAnimationFrame(raf); } else { raf = requestAnimationFrame(draw); }
    document.addEventListener('visibilitychange', function(){
      if(document.hidden){ cancelAnimationFrame(raf); } else if(!reduce){ raf = requestAnimationFrame(draw); }
    });
  })();

  /* ---------- the 88-second inhale ---------- */
  (function(){
    var p = $('.pulse-overlay'); if(!p || reduce) return;
    setInterval(function(){ p.classList.remove('is-pulsing'); void p.offsetWidth; p.classList.add('is-pulsing'); }, 88000);
  })();

  /* ---------- motifs: one small engine, six drawings ---------- */
  function rnd(seed){ var s = seed; return function(){ s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function motif(canvas, kind, live){
    var ctx = canvas.getContext('2d'), w = 0, h = 0, raf = 0, running = false, t0 = 0;
    var R = rnd(kind.length * 7919 + 13), stars = [];
    for(var i = 0; i < 46; i++) stars.push([R(), R(), R()]);
    var col = kind === 'ring' ? '232,120,84' : (kind === 'orbit' ? '255,214,140' : '120,200,255');
    function size(){
      var b = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(b.width, 10); h = Math.max(b.height, 10);
      canvas.width = w * dpr; canvas.height = h * dpr; ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    function line(x1,y1,x2,y2,a,lw){ ctx.strokeStyle = 'rgba(' + col + ',' + a + ')'; ctx.lineWidth = lw || 1; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke(); }
    function circle(x,y,r,a,fill){ ctx.beginPath(); ctx.arc(x,y,Math.max(r,0.1),0,6.2832); if(fill){ ctx.fillStyle = 'rgba(' + col + ',' + a + ')'; ctx.fill(); } else { ctx.strokeStyle = 'rgba(' + col + ',' + a + ')'; ctx.lineWidth = 1; ctx.stroke(); } }
    function frame(t){
      var s = t / 1000, cx = w/2, cy = h/2, m = Math.min(w, h), i, a;
      ctx.clearRect(0,0,w,h);
      var g = ctx.createRadialGradient(cx, kind === 'ring' ? 0 : cy * 0.5, 0, cx, cy * 0.6, Math.max(w,h) * 0.7);
      g.addColorStop(0, 'rgba(' + col + ',' + (kind === 'ring' ? 0.30 : 0.13) + ')'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
      if(kind === 'rays'){
        var oy = h * 0.04;
        for(i = 0; i < 110; i++){
          a = Math.PI * (i / 109);
          var len = m * (0.45 + 0.5 * stars[i % 46][0]) * (0.86 + 0.14 * Math.sin(s * 0.7 + i));
          line(cx, oy, cx + Math.cos(a) * len * 1.5, oy + Math.sin(a) * len, (0.03 + 0.09 * stars[i % 46][1]).toFixed(3), 0.7);
        }
        line(cx, 0, cx, h, 0.28, 1);
        circle(cx, oy, m * 0.52 + Math.sin(s * 0.5) * 4, 0.12); circle(cx, oy, m * 0.62, 0.07);
      } else if(kind === 'layers'){
        for(i = 0; i < 5; i++){
          var sz = m * (0.16 + i * 0.085), rot = s * 0.07 * (i % 2 ? -1 : 1) + i * 0.45;
          ctx.save(); ctx.translate(cx + Math.sin(s * 0.3 + i) * 6, cy * 0.86 + Math.cos(s * 0.25 + i) * 5); ctx.rotate(rot);
          ctx.strokeStyle = 'rgba(' + col + ',' + (0.34 - i * 0.05) + ')'; ctx.lineWidth = 1; ctx.strokeRect(-sz, -sz, sz*2, sz*2);
          ctx.restore();
        }
      } else if(kind === 'ripples'){
        for(i = 0; i < 7; i++){
          var ph = ((s * 0.09) + i / 7) % 1;
          circle(cx, cy * 0.9, ph * m * 0.95, ((1 - ph) * 0.34).toFixed(3));
        }
        circle(cx, cy * 0.9, 3, 0.9, true);
      } else if(kind === 'orbit'){
        var r1 = m * 0.30, r2 = m * 0.12;
        circle(cx, cy * 0.9, r1, 0.10);
        var bx = cx + Math.cos(s * 0.35) * r1, by = cy * 0.9 + Math.sin(s * 0.35) * r1 * 0.55;
        circle(cx, cy * 0.9, m * 0.03, 0.85, true);
        circle(bx, by, r2, 0.12);
        circle(bx, by, m * 0.016, 0.9, true);
        circle(bx + Math.cos(s * 1.3) * r2, by + Math.sin(s * 1.3) * r2, m * 0.008, 0.9, true);
        line(cx, cy * 0.9, bx, by, 0.10, 0.7);
      } else if(kind === 'stars'){
        var hx = cx, hy = h * 0.2;
        for(i = 0; i < 26; i++){
          var sx = stars[i][0] * w, sy = stars[i][1] * h * 0.9, tw = 0.35 + 0.65 * Math.abs(Math.sin(s * (0.4 + stars[i][2]) + i));
          if(i % 3 === 0) line(hx, hy, sx, sy, (0.07 * tw).toFixed(3), 0.7);
          circle(sx, sy, 1 + stars[i][2] * 1.6, tw.toFixed(2) * 0.8, true);
        }
        circle(hx, hy, 3.4 + Math.sin(s) * 0.8, 1, true);
      } else if(kind === 'ring'){
        var ry = h * 0.02, ra = m * 0.78, rb = m * 0.66;
        circle(cx, ry, ra, 0.4); circle(cx, ry, rb, 0.4);
        for(i = 0; i < 48; i++){
          a = (i / 48) * 6.2832 + s * 0.03;
          line(cx + Math.cos(a) * rb, ry + Math.sin(a) * rb, cx + Math.cos(a) * ra, ry + Math.sin(a) * ra, 0.34, 1);
        }
        circle(cx, ry, m * 0.98, 0.14);
      }
    }
    function loop(t){ if(!running) return; frame(t - t0 + 40000); raf = requestAnimationFrame(loop); }
    function start(){ if(running || reduce) return; running = true; raf = requestAnimationFrame(loop); }
    function stop(){ running = false; cancelAnimationFrame(raf); }
    size(); frame(40000);
    var onResize = function(){ size(); frame(40000); };
    window.addEventListener('resize', onResize);
    if(live) start();
    return { start:start, stop:stop, destroy:function(){ stop(); window.removeEventListener('resize', onResize); } };
  }

  function observe(items, cls, opts){
    if(!items.length) return;
    if(!('IntersectionObserver' in window) || reduce){ items.forEach(function(i){ i.classList.add(cls); }); return; }
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add(cls); io.unobserve(e.target); } });
    }, opts || { threshold:0.12, rootMargin:'0px 0px -6% 0px' });
    items.forEach(function(i){ io.observe(i); });
    teardown.push(function(){ io.disconnect(); });
  }

  /* ---------- transmit: Formspree in production, honest stub in the sandbox ---------- */
  function transmit(kind, data){
    if(CFG.sandbox) return wait(650).then(function(){ return { ok:true }; });
    var id = CFG.formspree;
    if(!id || /^YOUR_/.test(id)) return Promise.resolve({ ok:false, msg:'This form is not connected yet.' });
    data.type = kind;
    return fetch('https://formspree.io/f/' + id, {
      method:'POST', headers:{ 'Accept':'application/json', 'Content-Type':'application/json' }, body:JSON.stringify(data)
    }).then(function(r){ return { ok:r.ok, msg:r.ok ? '' : 'That did not go through. Please try again.' }; })
      .catch(function(){ return { ok:false, msg:'That did not go through. Please check your connection and try again.' }; });
  }

  /* ==========================================================
     HOME — chambers, pills, search
     ========================================================== */
  var homeSetMode = null;
  function initHome(root){
    var tabs = $$('.v-tab[role="tab"]', root), input = $('#vault-search', root);
    var MODES = ['accords','charters'];
    function mode(){ var t = tabs.filter(function(b){ return b.getAttribute('aria-selected') === 'true'; })[0]; return t ? t.dataset.panel : 'accords'; }
    function filter(){
      var q = (input.value || '').trim().toLowerCase(), cur = mode();
      var on = $$('#vault-tags-' + cur + ' .v-chip.is-on', root).map(function(c){ return c.dataset.tag; });
      [['#panel-' + cur, on], ['#blueprints', []]].forEach(function(pair){
        var panel = $(pair[0], root); if(!panel) return; var shown = 0;
        $$('.card', panel).forEach(function(card){
          var title = (card.dataset.title || '').toLowerCase(), tags = (card.dataset.tag || '').split(',').map(function(s){ return s.trim(); });
          var ok = (!q || title.indexOf(q) > -1) && (!pair[1].length || pair[1].some(function(t){ return tags.indexOf(t) > -1; }));
          card.classList.toggle('card-hidden', !ok); if(ok) shown++;
        });
        var empty = $('.v-empty', panel); if(empty) empty.classList.toggle('is-shown', !shown);
      });
    }
    function setMode(m, quiet){
      if(m === 'blueprints'){ var shelf = $('#blueprints', root); if(shelf && !quiet) shelf.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block:'start' }); return; }
      if(MODES.indexOf(m) < 0) m = 'accords';
      tabs.forEach(function(b){ b.setAttribute('aria-selected', b.dataset.panel === m ? 'true' : 'false'); });
      MODES.forEach(function(k){
        $('#panel-' + k, root).classList.toggle('is-active', k === m);
        $('#vault-tags-' + k, root).classList.toggle('is-active', k === m);
      });
      filter();
    }
    homeSetMode = setMode;
    tabs.forEach(function(b){ b.addEventListener('click', function(){
      var m = b.dataset.panel;
      if(CFG.sandbox){ if(location.hash.slice(1) === m) setMode(m); else location.hash = m; }
      else { setMode(m); try{ history.replaceState(null, '', '#' + m); }catch(e){} }
    }); });
    $$('.v-chip', root).forEach(function(c){ c.addEventListener('click', function(){ c.classList.toggle('is-on'); c.setAttribute('aria-pressed', c.classList.contains('is-on')); filter(); }); });
    var deb; input.addEventListener('input', function(){ clearTimeout(deb); deb = setTimeout(filter, 80); });
    // blueprint plates wake on hover / touch
    $$('.bp-card', root).forEach(function(card){
      var cv = $('canvas', card); if(!cv) return;
      var mo = motif(cv, card.dataset.motif, false);
      card.addEventListener('pointerenter', mo.start); card.addEventListener('pointerleave', mo.stop);
      card.addEventListener('pointerdown', function(){ mo.start(); setTimeout(mo.stop, 2400); });
      teardown.push(mo.destroy);
    });
    var h = (location.hash || '').slice(1);
    setMode(h === 'charters' ? 'charters' : 'accords', true);
    if(h === 'blueprints') setTimeout(function(){ setMode('blueprints'); }, 80);
  }

  /* ==========================================================
     ACCORD — the window opens, the field moves
     ========================================================== */
  function initAccord(root){
    var win = $('.ac-window', root); if(!win) return;
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ win.classList.add('is-entered'); }); });
    observe($$('.ac-doc .sec', root), 'is-visible', { threshold:0.08, rootMargin:'0px 0px -5% 0px' });
    var rings = $$('.ac-ring', root), cv = $('.ac-field canvas', root);
    var onMove = function(e){
      var b = win.getBoundingClientRect(), nx = (e.clientX - (b.left + b.width/2)) / b.width, ny = (e.clientY - window.innerHeight/2) / window.innerHeight;
      rings.forEach(function(r, i){ var k = (i + 1) * 16; r.style.setProperty('--px', (nx * k).toFixed(1) + 'px'); r.style.setProperty('--py', (ny * k).toFixed(1) + 'px'); });
    };
    window.addEventListener('pointermove', onMove, { passive:true });
    teardown.push(function(){ window.removeEventListener('pointermove', onMove); });
    if(cv && cv.getContext){
      var ctx = cv.getContext('2d'), R = rnd(4242), sp = [], raf = 0, w = 0, h = 0;
      for(var i = 0; i < 70; i++) sp.push([R(), R(), 0.3 + R() * 1.1, 0.2 + R() * 0.8]);
      var size = function(){ var b = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2); w = b.width; h = b.height; cv.width = w * d; cv.height = h * d; ctx.setTransform(d,0,0,d,0,0); };
      var draw = function(t){
        ctx.clearRect(0,0,w,h);
        var sc = window.scrollY * 0.06;
        for(var j = 0; j < sp.length; j++){
          var s = sp[j], x = (s[0] * w + t * 0.004 * s[3]) % w, y = (((s[1] * h - sc * s[3] - t * 0.006 * s[3]) % h) + h) % h;
          ctx.fillStyle = 'rgba(160,215,255,' + (0.18 + 0.4 * Math.abs(Math.sin(t / 1600 * s[3] + j))).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(x, y, s[2], 0, 6.2832); ctx.fill();
        }
        if(!reduce) raf = requestAnimationFrame(draw);
      };
      size(); window.addEventListener('resize', size); raf = requestAnimationFrame(draw);
      teardown.push(function(){ cancelAnimationFrame(raf); window.removeEventListener('resize', size); });
    }
  }

  /* ==========================================================
     CHARTER — Vault Mode / Paper Mode, index, progress
     ========================================================== */
  function initCharter(root){
    var btns = $$('.ch-mode', root);
    function setMode(m){
      document.body.classList.toggle('paper', m === 'paper'); document.documentElement.classList.toggle('paper', m === 'paper');
      btns.forEach(function(b){ b.setAttribute('aria-pressed', b.dataset.mode === m ? 'true' : 'false'); });
      sset('localStorage', 'cr-charter-mode', m);
    }
    btns.forEach(function(b){ b.addEventListener('click', function(){ setMode(b.dataset.mode); }); });
    setMode(sget('localStorage', 'cr-charter-mode') === 'paper' ? 'paper' : 'vault');
    teardown.push(function(){ document.body.classList.remove('paper'); document.documentElement.classList.remove('paper'); });

    var links = $$('.ch-index a', root), secs = $$('.ch-doc-panel .sec, .ch-secondary .sec', root), bar = $('.ch-progress', root);
    links.forEach(function(a){ a.addEventListener('click', function(e){
      e.preventDefault();
      var el = document.getElementById(a.dataset.target); if(el) el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block:'start' });
    }); });
    var onScroll = function(){
      var doc = document.documentElement, max = doc.scrollHeight - window.innerHeight;
      if(bar) bar.style.width = (max > 0 ? Math.min(100, window.scrollY / max * 100) : 0) + '%';
      var cur = secs[0];
      secs.forEach(function(s){ if(s.getBoundingClientRect().top < window.innerHeight * 0.4) cur = s; });
      links.forEach(function(a){ a.classList.toggle('is-current', cur && a.dataset.target === cur.id); });
    };
    window.addEventListener('scroll', onScroll, { passive:true }); onScroll();
    teardown.push(function(){ window.removeEventListener('scroll', onScroll); });
  }

  /* ==========================================================
     BLUEPRINT — public, gifted, sealed
     ========================================================== */
  function b64(s){ var bin = atob(s), u = new Uint8Array(bin.length); for(var i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; }
  function unseal(payload, key){
    if(!(window.crypto && crypto.subtle)) return Promise.reject(new Error('nocrypto'));
    var enc = new TextEncoder(), S = crypto.subtle;
    var kek = S.importKey('raw', enc.encode(key.trim().toLowerCase()), 'PBKDF2', false, ['deriveKey'])
      .then(function(k){ return S.deriveKey({ name:'PBKDF2', salt:b64(payload.salt), iterations:payload.iter, hash:'SHA-256' }, k, { name:'AES-GCM', length:256 }, false, ['decrypt']); });
    var content = payload.v === 2 ? kek.then(function(k){
      var slots = payload.slots || [], i = 0;
      var next = function(){
        if(i >= slots.length) return Promise.reject(new Error('nokey'));
        var sl = slots[i++];
        return S.decrypt({ name:'AES-GCM', iv:b64(sl.iv) }, k, b64(sl.wk))
          .then(function(raw){ return S.importKey('raw', raw, 'AES-GCM', false, ['decrypt']); }, next);
      };
      return next();
    }) : kek;
    return content
      .then(function(k){ return S.decrypt({ name:'AES-GCM', iv:b64(payload.iv) }, k, b64(payload.ct)); })
      .then(function(buf){ return new TextDecoder().decode(buf); });
  }
  function initBlueprint(root){
    var page = $('.bp-page', root), slug = page.dataset.slug, access = page.dataset.access;
    var hero = $('.bp-hero canvas', root), body = $('.bp-body', root), msg = $('.bp-msg', root);
    if(hero){ var mo = motif(hero, page.dataset.motif, true); teardown.push(mo.destroy); }
    var himg = $('.bp-hero-img', root);
    if(himg && !reduce){
      var onHero = function(e){
        himg.style.setProperty('--px', ((e.clientX / window.innerWidth - .5) * -14).toFixed(1) + 'px');
        himg.style.setProperty('--py', ((e.clientY / window.innerHeight - .5) * -10 + window.scrollY * .12).toFixed(1) + 'px');
      };
      window.addEventListener('pointermove', onHero, { passive:true });
      teardown.push(function(){ window.removeEventListener('pointermove', onHero); });
    }
    function open(scroll){
      body.classList.add('is-open');
      $$('.bp-body > *', root).forEach(function(el){ el.classList.add('bp-reveal'); });
      observe($$('.bp-reveal', root), 'is-visible');
      if(scroll) setTimeout(function(){ body.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block:'start' }); }, 60);
    }
    var enter = $('.bp-enter', root);
    if(enter) enter.addEventListener('click', function(){ open(true); enter.querySelector('span').textContent = 'Entered'; });

    /* sealed */
    var form = $('.bp-unlock', root);
    if(form){
      var payloadEl = $('.bp-sealed', root), payload = payloadEl ? JSON.parse(payloadEl.textContent) : null, input = $('.bp-key', root);
      var tryKey = function(key, silent){
        if(!payload || !key) return;
        unseal(payload, key).then(function(html){
          body.innerHTML = html + '<div class="bp-end"></div>';
          sset('sessionStorage', 'cr-key-' + slug, key);
          msg.className = 'bp-msg is-good'; msg.textContent = 'Opened.';
          $('.bp-state', root).textContent = access === 'exchange' ? 'Sacred Exchange · Opened' : 'Unsealed';
          var first = $('.bp-actions:not(.bp-unlock)', root); if(first) first.style.display = 'none';
          form.style.display = 'none'; open(!silent);
        }).catch(function(err){
          if(silent) return;
          msg.className = 'bp-msg is-bad';
          msg.textContent = err && err.message === 'nocrypto' ? 'This browser cannot open sealed documents here.' : 'That key does not open this document.';
          form.classList.remove('bp-shake'); void form.offsetWidth; form.classList.add('bp-shake');
        });
      };
      form.addEventListener('submit', function(e){ e.preventDefault(); tryKey(input.value, false); });
      var saved = sget('sessionStorage', 'cr-key-' + slug); if(saved) tryKey(saved, true);
    }

    /* exchange: sandbox stand-in for the Stripe link */
    var pre = $('.bp-exchange-preview', root);
    if(pre) pre.addEventListener('click', function(){ msg.className = 'bp-msg'; msg.textContent = 'Sandbox preview: the Stripe link opens here once it is connected. Try the key source-preview.'; });

    /* gifted + request: one modal, two kinds */
    var modal = $('.vf-modal', root), trigger = $('.bp-claim, .bp-request', root);
    var claimed = function(scroll){
      $('.bp-state', root).textContent = 'Gifted · Received';
      if(trigger){ trigger.querySelector('span').textContent = 'Received'; trigger.disabled = true; }
      msg.textContent = ''; open(scroll);
    };
    if(access === 'gifted' && sget('localStorage', 'cr-gift-' + slug)) claimed(false);
    if(modal && trigger){
      var kind = modal.dataset.kind, box = $('.vf-box', modal), gform = $('.vf-form', modal), note = $('.vf-note', modal);
      var close = function(){ modal.classList.remove('is-open'); };
      trigger.addEventListener('click', function(){ box.classList.remove('sent'); modal.classList.add('is-open'); var f = $('input', gform); if(f) f.focus(); });
      $('.vf-cancel', modal).addEventListener('click', close);
      modal.addEventListener('click', function(e){ if(e.target === modal) close(); });
      var onKey = function(e){ if(e.key === 'Escape') close(); };
      document.addEventListener('keydown', onKey); teardown.push(function(){ document.removeEventListener('keydown', onKey); });
      gform.addEventListener('submit', function(e){
        e.preventDefault(); note.textContent = '';
        var email = gform.elements.email.value.trim();
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)){ note.textContent = 'Enter an email address we can reach.'; return; }
        var btn = $('.vf-submit', gform); btn.disabled = true;
        var data = { blueprint: page.dataset.title, name: gform.elements.name.value.trim(), email: email,
          _subject: (kind === 'gift' ? 'Gift claimed: ' : 'Access requested: ') + page.dataset.title };
        if(gform.elements.message) data.message = gform.elements.message.value.trim();
        transmit(kind === 'gift' ? 'gift' : 'access-request', data).then(function(r){
          btn.disabled = false;
          if(!r.ok){ note.textContent = r.msg; return; }
          box.classList.add('sent');
          if(kind === 'gift'){ sset('localStorage', 'cr-gift-' + slug, '1'); setTimeout(function(){ close(); claimed(true); }, 1500); }
          else { trigger.querySelector('span').textContent = 'Request sent'; trigger.disabled = true;
                 msg.className = 'bp-msg'; msg.textContent = 'Request received. If it is granted, a key will reach you.'; setTimeout(close, 2600); }
        });
      });
    }
  }

  /* ==========================================================
     SEND SIGNAL
     ========================================================== */
  function initSignal(root){
    var card = $('.transmit-card', root), input = $('#tx-input', root), meta = $('.tx-meta', root), tog = $('#tx-toggle-meta', root), err = $('.tx-err', root), send = $('#tx-send', root);
    tog.addEventListener('click', function(e){
      e.preventDefault(); var open = meta.classList.toggle('is-open');
      tog.setAttribute('aria-expanded', open); tog.textContent = open ? 'Hide contact info' : 'Add contact info';
    });
    send.addEventListener('click', function(){
      var m = input.value.trim(); err.textContent = '';
      if(!m){ input.focus(); return; }
      send.disabled = true;
      transmit('signal', { message:m, name:$('#tx-name', root).value.trim(), email:$('#tx-email', root).value.trim(), _subject:'Signal — The Vault' })
        .then(function(r){
          send.disabled = false;
          if(!r.ok){ err.textContent = r.msg; return; }
          card.classList.add('is-sent'); $('#tx-sent', root).classList.add('open');
        });
    });
  }

  function initQuestions(root){ observe($$('.tq-question', root), 'is-visible', { threshold:0.18, rootMargin:'0px 0px -8% 0px' }); }

  function init(){
    var root = $('#app'), page = $('[data-page]', root); if(!page) return;
    var kind = page.dataset.page;
    if(kind === 'home') initHome(root);
    if(kind === 'accord') initAccord(root);
    if(kind === 'charter') initCharter(root);
    if(kind === 'blueprint') initBlueprint(root);
    if(kind === 'signal') initSignal(root);
    if(kind === 'questions') initQuestions(root);
  }

  /* ---------- sandbox: one file, every page, routed on a plain #name ---------- */
  if(CFG.sandbox){
    var HOME = ['vault','accords','charters','blueprints'], current = null, app = $('#app');
    var route = function(){
      var r = (location.hash || '').slice(1) || 'vault', isHome = HOME.indexOf(r) > -1, id = isHome ? 'vault' : r;
      var tpl = document.getElementById('route-' + id);
      if(!tpl){ id = 'vault'; isHome = true; r = 'vault'; tpl = document.getElementById('route-vault'); }
      if(current !== id){
        teardown.forEach(function(f){ try{ f(); }catch(e){} }); teardown = []; homeSetMode = null;
        app.innerHTML = ''; app.appendChild(tpl.content.cloneNode(true));
        document.body.className = tpl.dataset.body || '';
        document.title = tpl.dataset.title || 'The Vault';
        current = id; window.scrollTo(0, 0); init();
      } else if(isHome && homeSetMode){ homeSetMode(r === 'vault' ? 'accords' : r); }
    };
    window.addEventListener('hashchange', route); route();
  } else {
    init();
  }
})();
