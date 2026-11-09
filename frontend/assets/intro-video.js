/* AI-narrated intro for the portfolio.
 *
 * Works with NO video file: it plays animated scenes and speaks the script with the
 * browser's built-in voice. It prefers a deep British male voice (assistant style) when
 * the device has one installed.
 *
 * Optional settings (put in config.js, before the other scripts):
 *   window.PORTFOLIO_INTRO_VIDEO  = "intro.mp4";                 // play a recorded narration video instead
 *   window.PORTFOLIO_INTRO_SCENES = [ {kicker, big, sub, say}, ... ]; // change the script
 *   window.PORTFOLIO_INTRO_AUTO   = false;                       // don't open automatically on first visit
 */
(function () {
  'use strict';

  var DEFAULT_SCENES = [
    { kicker: 'Welcome', big: 'Welcome',
      say: 'Welcome. I am Mohammad Asihf, and this is my portfolio.' },
    { kicker: 'Meet', big: 'Mohammad Asihf', sub: 'Full Stack & AI Developer',
      chips: [{t:'React',tip:'Fast, component-driven interfaces'},{t:'Node.js',tip:'APIs and real-time backends'},{t:'MongoDB',tip:'Flexible, scalable data models'},{t:'Express',tip:'Clean, secure REST services'}],
      say: 'I am a full stack developer who builds complete web applications, from pixel-perfect interfaces to powerful Node dot js backends.' },
    { kicker: 'Intelligence', big: 'Smart Systems', sub: 'LangChain · RAG · Gemini AI',
      chips: [{t:'LangChain',tip:'Chains models with tools and data'},{t:'RAG',tip:'Answers grounded in your own documents'},{t:'Vector DB',tip:'Semantic search over embeddings'},{t:'Gemini AI',tip:'Multimodal reasoning and generation'}],
      say: 'I go further. Using LangChain, RAG pipelines, vector databases and Gemini AI, I build systems that understand questions and give real answers.' },
    { kicker: 'Track record', big: 'Built to Ship', sub: 'Full stack · AI · Web design',
      stats: [{n:20,s:'+',l:'Projects'},{n:14,s:'',l:'Technologies'},{n:10,s:'+',l:'Happy clients'}],
      say: 'Over twenty projects. From AI document assistants to full stack marketplaces, each one built with clean code and sharp design.' },
    { kicker: 'Next', big: "Let's Build", sub: 'Where would you like to go?',
      cta: true,
      say: 'Explore my work below. Have an idea worth building? Let us connect.' }
  ];

  var SCENES = (Array.isArray(window.PORTFOLIO_INTRO_SCENES) && window.PORTFOLIO_INTRO_SCENES.length)
    ? window.PORTFOLIO_INTRO_SCENES : DEFAULT_SCENES;
  var VIDEO = window.PORTFOLIO_INTRO_VIDEO || '';
  var synth = ('speechSynthesis' in window) ? window.speechSynthesis : null;
  var CAN_SPEAK = !!(synth && window.SpeechSynthesisUtterance);

  // Your own voice: put recordings at assets/voice/1.mp3 ... 5.mp3 (one per scene). Missing files fall back to the browser voice.
  var VOICE = (window.PORTFOLIO_INTRO_VOICE === undefined) ? 'assets/voice/' : window.PORTFOLIO_INTRO_VOICE;
  var curAudio = null;
  function stopAudio() { if (curAudio) { curAudio.onended = curAudio.onerror = null; curAudio.pause(); curAudio = null; } }

  var voice = null, muted = false, running = false, tok = 0, timers = [], keepUtterance = null, curIdx = 0;

  function $(id) { return document.getElementById(id); }

  // ---- voice: deep British male first (assistant style), then any deep male English voice ----
  function pickVoice() {
    if (!synth) return;
    var all = synth.getVoices() || [];
    var en = all.filter(function (v) { return /^en[-_]/i.test(v.lang); });
    var pool = en.length ? en : all;
    var prefs = [
      /google uk english male/i,
      /microsoft (george|ryan)/i,
      /\bdaniel\b/i,
      /\b(oliver|arthur)\b/i,
      /microsoft (guy|davis|mark|david|ravi)/i,
      /\b(alex|fred|tom|rishi|george)\b/i,
      /\bmale\b/i
    ];
    var found = null;
    for (var i = 0; i < prefs.length && !found; i++) {
      var re = prefs[i];
      found = pool.find(function (v) { return re.test(v.name); }) || null;
    }
    voice = found || pool[0] || null;
  }
  if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; }

  // ---- build the overlay ----
  var wrap = document.createElement('div');
  wrap.id = 'ivWrap';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', 'Introduction');
  wrap.innerHTML =
    '<div class="iv-grid"></div><div class="iv-glow"></div><div class="iv-spot" id="ivSpot"></div>' +
    '<div class="iv-bar top"></div><div class="iv-bar bot"></div>' +
    (VIDEO ? '<video id="ivVideo" playsinline preload="metadata"></video>' : '') +
    '<div class="iv-stage" id="ivStage">' +
      '<div class="iv-kicker" id="ivKicker"></div>' +
      '<div class="iv-big" id="ivBig"></div>' +
      '<div class="iv-sub" id="ivSub"></div>' +
      '<div class="iv-viz" id="ivViz"></div>' +
    '</div>' +
    '<div class="iv-cap" id="ivCap" aria-live="polite"></div>' +
    '<div class="iv-start" id="ivStart"><div class="iv-start-inner">' +
      '<div class="iv-kicker">A short introduction</div>' +
      '<h2 class="iv-start-title">Meet Mohammad Asihf</h2>' +
      '<p class="iv-start-note">A narrated, interactive intro. Sound on for the full experience. Use the controls, arrow keys or swipe.</p>' +
      '<button type="button" class="iv-btn" id="ivPlay"><iconify-icon icon="lucide:play" width="14"></iconify-icon> Play intro</button>' +
      '<button type="button" class="iv-link" id="ivSkipStart">Skip to portfolio</button>' +
    '</div></div>' +
    '<div class="iv-top">' +
      '<button type="button" class="iv-icon-btn" id="ivMute"></button>' +
      '<button type="button" class="iv-icon-btn" id="ivClose" aria-label="Close intro"><iconify-icon icon="lucide:x" width="16"></iconify-icon></button>' +
    '</div>' +
    '<div class="iv-ctrl" id="ivCtrl">' +
      '<button type="button" class="iv-icon-btn sm" id="ivPrev" aria-label="Previous scene"><iconify-icon icon="lucide:skip-back" width="15"></iconify-icon></button>' +
      '<button type="button" class="iv-icon-btn" id="ivPause"></button>' +
      '<button type="button" class="iv-icon-btn sm" id="ivNext" aria-label="Next scene"><iconify-icon icon="lucide:skip-forward" width="15"></iconify-icon></button>' +
    '</div>' +
    '<div class="iv-dots" id="ivDots"></div>' +
    '<div class="iv-prog" id="ivProg"></div>';
  document.body.appendChild(wrap);

  var dots = $('ivDots');
  SCENES.forEach(function (sc, k) {
    var d = document.createElement('button');
    d.type = 'button'; d.className = 'iv-dot';
    d.setAttribute('aria-label', 'Go to scene ' + (k + 1) + ': ' + (sc.kicker || ''));
    d.title = sc.kicker || ('Scene ' + (k + 1));
    d.addEventListener('click', function () { if (wrap.classList.contains('playing')) goTo(k); });
    dots.appendChild(d);
  });

  function setMuteIcon() {
    var b = $('ivMute');
    b.innerHTML = '<iconify-icon icon="lucide:' + (muted ? 'volume-x' : 'volume-2') + '" width="16"></iconify-icon>';
    b.setAttribute('aria-label', muted ? 'Unmute narration' : 'Mute narration');
    b.style.display = (!CAN_SPEAK && !VIDEO) ? 'none' : '';
  }
  setMuteIcon();

  // ---- scene drawing ----
  function splitBig(el, text) {
    el.textContent = ''; el.classList.add('split'); el.setAttribute('aria-label', text);
    var n = 0, words = text.split(' ');
    words.forEach(function (w, wi) {
      var word = document.createElement('span'); word.className = 'ivw';
      w.split('').forEach(function (ch) {
        var l = document.createElement('span'); l.className = 'ivl'; l.style.setProperty('--i', n++); l.textContent = ch; word.appendChild(l);
      });
      el.appendChild(word);
      if (wi < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
  }

  function showScene(i) {
    var s = SCENES[i];
    if (window.IV3D) IV3D.scene(i);
    var big = $('ivBig');
    $('ivViz').innerHTML = '';
    $('ivStage').classList.toggle('has-viz', !!(s.chips || s.stats || s.cta));
    big.classList.add('out');
    setTimeout(function () {
      $('ivKicker').textContent = s.kicker || '';
      splitBig(big, s.big || '');
      $('ivSub').textContent = s.sub || '';
      $('ivCap').textContent = s.say || '';
      renderViz(s);
      big.classList.remove('out');
      big.classList.add('in-from');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { big.classList.remove('in-from'); });
      });
    }, i === 0 ? 0 : 380);
    Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k <= i); });
    $('ivProg').style.width = ((i + 1) / SCENES.length * 100) + '%';
  }


  // ---- interactive visuals for each scene ----
  function goSection(sel) {
    close();
    setTimeout(function () { var el = document.querySelector(sel); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 380);
  }
  function renderViz(s) {
    var v = $('ivViz'); v.innerHTML = '';
    if (s.chips) {
      var row = document.createElement('div'); row.className = 'iv-chips';
      var tip = document.createElement('div'); tip.className = 'iv-tip'; tip.textContent = 'Tap or hover a technology';
      s.chips.forEach(function (c, k) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'iv-chip';
        b.style.animationDelay = (k * 90) + 'ms'; b.textContent = c.t;
        var show = function () {
          tip.textContent = c.tip; tip.classList.add('show');
          Array.prototype.forEach.call(row.children, function (x) { x.classList.remove('active'); });
          b.classList.add('active');
        };
        b.addEventListener('mouseenter', show); b.addEventListener('click', show); b.addEventListener('focus', show);
        row.appendChild(b);
      });
      v.appendChild(row); v.appendChild(tip);
    }
    if (s.stats) {
      var sr = document.createElement('div'); sr.className = 'iv-stats';
      s.stats.forEach(function (st, k) {
        var d = document.createElement('div'); d.className = 'iv-stat'; d.style.animationDelay = (k * 120) + 'ms';
        d.innerHTML = '<b>0</b><span>' + st.l + '</span>'; sr.appendChild(d);
        var el = d.firstChild, t0 = null;
        (function step(ts) {
          if (t0 === null) t0 = ts + k * 120;
          var p = Math.min(1, Math.max(0, (ts - t0) / 1300));
          el.textContent = Math.round(st.n * (1 - Math.pow(1 - p, 3))) + (p >= 1 ? (st.s || '') : '');
          if (p < 1) requestAnimationFrame(step);
        })(performance.now());
      });
      v.appendChild(sr);
    }
    if (s.cta) {
      var cr = document.createElement('div'); cr.className = 'iv-cta';
      [ { i: 'lucide:briefcase', t: 'View my work', f: function () { goSection('#projects'); } },
        { i: 'lucide:file-text', t: 'My resume', f: function () { close(); setTimeout(function () { var r = $('resumeOpen'); if (r) r.click(); }, 380); } },
        { i: 'lucide:message-circle', t: "Let's talk", f: function () { goSection('#contact'); } },
        { i: 'lucide:rotate-ccw', t: 'Replay', ghost: true, f: function () { goTo(0); } }
      ].forEach(function (a, k) {
        var b = document.createElement('button'); b.type = 'button';
        b.className = 'iv-cbtn' + (a.ghost ? ' ghost' : ''); b.style.animationDelay = (k * 100) + 'ms';
        b.innerHTML = '<iconify-icon icon="' + a.i + '" width="15"></iconify-icon> ' + a.t;
        b.addEventListener('click', a.f); cr.appendChild(b);
      });
      v.appendChild(cr);
    }
  }

  // ---- playback ----
  function queue(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function playScene(i) {
    if (!running) return;
    if (i >= SCENES.length) return endIntro();
    curIdx = i;
    showScene(i);
    var my = ++tok;
    var text = SCENES[i].say || '';
    var advance = function () {
      if (my !== tok || !running) return;
      queue(function () { playScene(i + 1); }, 600);
    };

    if (synth) synth.cancel();
    stopAudio();
    if (!CAN_SPEAK || muted) {
      queue(advance, Math.max(3800, text.length * 60));
      return;
    }
    var speakTTS = function () {
      if (my !== tok || !running) return;
      var u = new SpeechSynthesisUtterance(text);
      if (voice) { u.voice = voice; u.lang = voice.lang; } else { u.lang = 'en-GB'; }
      u.pitch = 0.7; u.rate = 0.92; u.volume = 1;
      u.onend = advance; u.onerror = advance;
      keepUtterance = u;
      synth.speak(u);
      queue(advance, Math.max(6000, text.length * 90));
    };
    if (VOICE) {                                         // play the owner's recorded voice first
      var a = new Audio(VOICE + (i + 1) + '.mp3'), done = false;
      curAudio = a;
      var fallback = function () { if (done || my !== tok) return; done = true; stopAudio(); speakTTS(); };
      a.onended = function () { if (done) return; done = true; advance(); };
      a.onerror = fallback;
      var pr = a.play(); if (pr && pr.catch) pr.catch(fallback);
      return;
    }
    speakTTS();
  }

  function playVideo() {
    var v = $('ivVideo');
    $('ivStage').style.display = 'none';
    $('ivCap').style.display = 'none';
    $('ivDots').style.display = 'none';
    $('ivCtrl').style.display = 'none';
    if (window.IV3D) IV3D.stop();
    v.style.display = 'block';
    if (!v.getAttribute('src')) v.src = VIDEO;
    v.muted = muted;
    v.onended = endIntro;
    v.ontimeupdate = function () {
      if (v.duration) $('ivProg').style.width = (v.currentTime / v.duration * 100) + '%';
    };
    var p = v.play();
    if (p && p.catch) p.catch(function () {});
  }

  function startPlayback() {
    $('ivStart').classList.add('hide');
    wrap.classList.add('playing');
    if (VIDEO) return playVideo();
    running = true;
    playScene(0);
  }

  // Single place that returns the overlay to a clean, ready-to-open state.
  function resetAll() {
    running = false; tok++; clearTimers();
    if (synth) synth.cancel();
    stopAudio();
    $('ivStart').classList.remove('hide');
    wrap.classList.remove('playing');
    $('ivStage').style.display = '';
    $('ivCap').style.display = '';
    $('ivDots').style.display = '';
    $('ivProg').style.width = '0';
    $('ivCap').textContent = '';
    $('ivViz').innerHTML = ''; $('ivCtrl').style.display = ''; paused = false; setPauseIcon();
    Array.prototype.forEach.call(dots.children, function (d) { d.classList.remove('on'); });
    var v = $('ivVideo');
    if (v) { v.pause(); v.removeAttribute('src'); v.load(); v.style.display = 'none'; }
  }

  function open() {
    resetAll();
    wrap.classList.add('open');
    if (window.IV3D) IV3D.start();
    document.body.style.overflow = 'hidden';
    setTimeout(function () { var p = $('ivPlay'); if (p) p.focus(); }, 50);
  }

  function close() {
    resetAll();
    wrap.classList.remove('open');
    if (window.IV3D) IV3D.stop();
    document.body.style.overflow = '';
    try { sessionStorage.setItem('iv-seen', '1'); } catch (e) {}
  }

  function endIntro() {
    running = false;
    $('ivProg').style.width = '100%';
    if (SCENES[SCENES.length - 1].cta) return;      // stay open so the visitor can pick where to go
    queue(close, 900);
  }

  // ---- navigation: jump, pause, swipe, keys ----
  var paused = false;
  function setPauseIcon() {
    var b = $('ivPause');
    b.innerHTML = '<iconify-icon icon="lucide:' + (paused ? 'play' : 'pause') + '" width="16"></iconify-icon>';
    b.setAttribute('aria-label', paused ? 'Resume' : 'Pause');
  }
  setPauseIcon();
  function stopSpeech() { tok++; clearTimers(); if (synth) synth.cancel(); stopAudio(); }
  function goTo(i) {
    i = Math.max(0, Math.min(SCENES.length - 1, i));
    paused = false; setPauseIcon(); stopSpeech();
    running = true; playScene(i);
  }
  function togglePause() {
    if (!running) return;
    paused = !paused; setPauseIcon();
    if (paused) stopSpeech(); else playScene(curIdx);
  }
  $('ivPrev').addEventListener('click', function () { goTo(curIdx - 1); });
  $('ivNext').addEventListener('click', function () { goTo(curIdx + 1); });
  $('ivPause').addEventListener('click', togglePause);

  // pointer parallax + spotlight
  wrap.addEventListener('mousemove', function (e) {
    var x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
    wrap.style.setProperty('--px', x.toFixed(3)); wrap.style.setProperty('--py', y.toFixed(3));
    wrap.style.setProperty('--mx', e.clientX + 'px'); wrap.style.setProperty('--my', e.clientY + 'px');
  });
  // swipe on touch screens
  var tx = null;
  wrap.addEventListener('touchstart', function (e) { tx = e.touches[0].clientX; }, { passive: true });
  wrap.addEventListener('touchend', function (e) {
    if (tx === null || !wrap.classList.contains('playing')) return;
    var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 70) goTo(curIdx + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // ---- controls ----
  $('ivPlay').addEventListener('click', startPlayback);
  $('ivSkipStart').addEventListener('click', close);
  $('ivClose').addEventListener('click', close);
  $('ivMute').addEventListener('click', function () {
    muted = !muted;
    setMuteIcon();
    var v = $('ivVideo');
    if (v) v.muted = muted;
    if (muted && synth) {
      stopAudio(); synth.cancel();           // the scene's timer will move on silently
    } else if (!muted && running) {
      tok++; clearTimers();     // replay the current line with voice
      playScene(curIdx);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (!wrap.classList.contains('open')) return;
    if (e.key === 'Escape') return close();
    if (!wrap.classList.contains('playing') || VIDEO) return;
    if (e.key === 'ArrowRight') goTo(curIdx + 1);
    else if (e.key === 'ArrowLeft') goTo(curIdx - 1);
    else if (e.key === ' ' && !/^(BUTTON|A)$/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); togglePause(); }
  });

  // Hero "Watch intro" button: delegated at document level so it always works,
  // even if the hero content is re-rendered.
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('#ivOpen') : null;
    if (!btn) return;
    e.preventDefault();
    open();
  });

  var ctas = $('heroCtas');
  if (ctas && !$('ivOpen')) {
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'ivOpen';
    b.className = 'iv-hero-btn hoverable';
    b.innerHTML = '<iconify-icon icon="lucide:play" width="14"></iconify-icon> Watch intro';
    ctas.appendChild(b);
  }

  // Open automatically once per visit, right after the loading screen finishes.
  var autoOn = window.PORTFOLIO_INTRO_AUTO !== false;
  var alreadyShown = false;
  try { alreadyShown = sessionStorage.getItem('iv-seen') === '1' || sessionStorage.getItem('iv-auto') === '1'; } catch (e) {}
  var loader = $('loader');
  if (autoOn && loader && !alreadyShown) {
    var t = setInterval(function () {
      if (loader.style.display === 'none') {
        clearInterval(t);
        try { sessionStorage.setItem('iv-auto', '1'); } catch (e) {}
        setTimeout(open, 700);
      }
    }, 300);
  }
})();
