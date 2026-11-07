/* AI-narrated intro for the portfolio.
 *
 * Works with NO video file: it plays animated scenes and speaks the script with the
 * browser's built-in voice (it picks a deep male English voice when one is installed).
 *
 * Optional settings (put in config.js, before the other scripts):
 *   window.PORTFOLIO_INTRO_VIDEO  = "intro.mp4";     // play a real recorded video instead
 *   window.PORTFOLIO_INTRO_SCENES = [ {kicker, big, sub, say, ...}, ... ]; // change the script
 *   window.PORTFOLIO_INTRO_AUTO   = false;           // don't open automatically on first visit
 */
(function () {
  'use strict';

  var DEFAULT_SCENES = [
    { kicker: 'Welcome', big: 'Welcome',
      say: 'Welcome. You have entered the portfolio of Mohammad Asihf.' },
    { kicker: 'Meet', big: 'Mohammad Asihf', sub: 'Full Stack & AI Developer',
      say: 'Meet a developer who builds complete web applications, from pixel-perfect interfaces to powerful Node dot js backends.' },
    { kicker: 'Intelligence', big: 'Smart Systems', sub: 'LangChain · RAG · Gemini AI',
      say: 'He goes further. Using LangChain, RAG pipelines, vector databases and Gemini AI, he builds systems that understand questions and give real answers.' },
    { kicker: 'Track record', big: 'Built to Ship', sub: 'Full stack · AI · Web design',
      say: 'Over twenty projects. From AI document assistants to full stack marketplaces, each one built with clean code and sharp design.' },
    { kicker: 'Next', big: "Let's Build", sub: 'Explore the work below',
      say: 'Explore the work below. Have an idea worth building? Let us connect.' }
  ];

  var SCENES = (Array.isArray(window.PORTFOLIO_INTRO_SCENES) && window.PORTFOLIO_INTRO_SCENES.length)
    ? window.PORTFOLIO_INTRO_SCENES : DEFAULT_SCENES;
  var VIDEO = window.PORTFOLIO_INTRO_VIDEO || '';
  var synth = ('speechSynthesis' in window) ? window.speechSynthesis : null;
  var CAN_SPEAK = !!(synth && window.SpeechSynthesisUtterance);

  var voice = null, muted = false, running = false, tok = 0, timers = [], keepUtterance = null, curIdx = 0;

  function $(id) { return document.getElementById(id); }

  // ---- voice selection: prefer deep, bold male English voices ----
  function pickVoice() {
    if (!synth) return;
    var all = synth.getVoices() || [];
    var en = all.filter(function (v) { return /^en[-_]/i.test(v.lang); });
    var pool = en.length ? en : all;
    var prefs = [
      /google uk english male/i,
      /microsoft (guy|davis|ryan|mark|david|ravi)/i,
      /\b(daniel|alex|fred|george|tom|rishi|david|mark)\b/i,
      /\bmale\b/i
    ];
    var found = null;
    for (var i = 0; i < prefs.length && !found; i++) {
      found = pool.find(function (v) { return prefs[i].test(v.name); }) || null;
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
    '<div class="iv-grid"></div><div class="iv-glow"></div>' +
    '<div class="iv-bar top"></div><div class="iv-bar bot"></div>' +
    (VIDEO ? '<video id="ivVideo" playsinline preload="metadata"></video>' : '') +
    '<div class="iv-stage" id="ivStage">' +
      '<div class="iv-kicker" id="ivKicker"></div>' +
      '<div class="iv-big" id="ivBig"></div>' +
      '<div class="iv-sub" id="ivSub"></div>' +
    '</div>' +
    '<div class="iv-cap" id="ivCap" aria-live="polite"></div>' +
    '<div class="iv-start" id="ivStart"><div class="iv-start-inner">' +
      '<div class="iv-kicker">A short introduction</div>' +
      '<h2 class="iv-start-title">Meet Mohammad Asihf</h2>' +
      '<p class="iv-start-note">A narrated intro, about 30 seconds. Sound on for the full experience.</p>' +
      '<button type="button" class="iv-btn" id="ivPlay"><iconify-icon icon="lucide:play" width="14"></iconify-icon> Play intro</button>' +
      '<button type="button" class="iv-link" id="ivSkipStart">Skip to portfolio</button>' +
    '</div></div>' +
    '<div class="iv-top">' +
      '<button type="button" class="iv-icon-btn" id="ivMute" aria-label="Mute narration"></button>' +
      '<button type="button" class="iv-icon-btn" id="ivClose" aria-label="Close intro"><iconify-icon icon="lucide:x" width="16"></iconify-icon></button>' +
    '</div>' +
    '<div class="iv-dots" id="ivDots"></div>' +
    '<div class="iv-prog" id="ivProg"></div>';
  document.body.appendChild(wrap);

  var dots = $('ivDots');
  SCENES.forEach(function () { dots.appendChild(document.createElement('i')); });

  function setMuteIcon() {
    $('ivMute').innerHTML = '<iconify-icon icon="lucide:' + (muted ? 'volume-x' : 'volume-2') + '" width="16"></iconify-icon>';
    $('ivMute').setAttribute('aria-label', muted ? 'Unmute narration' : 'Mute narration');
    if (!CAN_SPEAK && !VIDEO) $('ivMute').style.display = 'none';
  }
  setMuteIcon();

  // ---- scene drawing ----
  function showScene(i) {
    var s = SCENES[i];
    var big = $('ivBig');
    big.classList.add('out');
    setTimeout(function () {
      $('ivKicker').textContent = s.kicker || '';
      big.textContent = s.big || '';
      $('ivSub').textContent = s.sub || '';
      $('ivCap').textContent = s.say || '';
      big.classList.remove('out');
      big.classList.add('in-from');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { big.classList.remove('in-from'); });
      });
    }, i === 0 ? 0 : 380);
    Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k <= i); });
    $('ivProg').style.width = ((i + 1) / SCENES.length * 100) + '%';
  }

  // ---- playback (speech + timing, scene by scene) ----
  function queue(fn, ms) { timers.push(setTimeout(fn, ms)); }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function playScene(i) {
    if (!running) return;
    if (i >= SCENES.length) return endIntro();
    curIdx = i;
    showScene(i);
    var my = ++tok;
    var s = SCENES[i];
    var text = s.say || '';
    var advance = function () {
      if (my !== tok || !running) return;
      queue(function () { playScene(i + 1); }, 600);
    };

    if (synth) synth.cancel();
    if (!CAN_SPEAK || muted) {
      queue(advance, Math.max(3800, text.length * 60));   // silent: read at a comfortable pace
      return;
    }
    var u = new SpeechSynthesisUtterance(text);
    if (voice) { u.voice = voice; u.lang = voice.lang; } else { u.lang = 'en-US'; }
    u.pitch = 0.72;   // lower = deeper, bolder
    u.rate = 0.94;    // a touch slower = more authority
    u.volume = 1;
    u.onend = advance;
    u.onerror = advance;
    keepUtterance = u;                                     // keep a reference so the engine doesn't drop it
    synth.speak(u);
    queue(advance, Math.max(6000, text.length * 90));      // safety net if the engine never reports an end
  }

  function startPlayback() {
    $('ivStart').classList.add('hide');
    wrap.classList.add('playing');
    if (VIDEO) return playVideo();
    running = true;
    playScene(0);
  }

  function playVideo() {
    var v = $('ivVideo');
    $('ivStage').style.display = 'none';
    $('ivCap').style.display = 'none';
    $('ivDots').style.display = 'none';
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

  function resetUI() {
    $('ivStart').classList.remove('hide');
    wrap.classList.remove('playing');
    $('ivStage').style.display = '';
    $('ivCap').style.display = '';
    $('ivDots').style.display = '';
    $('ivProg').style.width = '0';
    var v = $('ivVideo');
    if (v) { v.pause(); v.style.display = 'none'; }
    Array.prototype.forEach.call(dots.children, function (d) { d.classList.remove('on'); });
  }

  function open() {
    running = false; tok++; clearTimers();
    if (synth) synth.cancel();
    resetUI();
    wrap.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { $('ivPlay').focus(); }, 50);
  }

  function close() {
    running = false; tok++; clearTimers();
    if (synth) synth.cancel();
    resetUI();
    wrap.classList.remove('open');
    document.body.style.overflow = '';
    try { sessionStorage.setItem('iv-seen', '1'); } catch (e) {}
  }

  function endIntro() {
    running = false;
    queue(close, 900);
  }

  // ---- controls ----
  $('ivPlay').addEventListener('click', startPlayback);
  $('ivSkipStart').addEventListener('click', close);
  $('ivClose').addEventListener('click', close);
  $('ivMute').addEventListener('click', function () {
    muted = !muted;
    setMuteIcon();
    var v = $('ivVideo');
    if (v) v.muted = muted;
    // switching mute mid-line: cut the current speech; playback continues silently or with voice
    if (muted && synth) synth.cancel();
    else if (!muted && running && synth) {
      // restart the current scene with the voice
      tok++; clearTimers();
      playScene(curIdx);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (wrap.classList.contains('open') && e.key === 'Escape') close();
  });

  // ---- entry points ----
  // 1) a button in the hero so visitors can replay it any time
  var ctas = $('heroCtas');
  if (ctas) {
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'ivOpen';
    b.className = 'iv-hero-btn hoverable';
    b.innerHTML = '<iconify-icon icon="lucide:play" width="14"></iconify-icon> Watch intro';
    b.addEventListener('click', open);
    ctas.appendChild(b);
  }

  // 2) open automatically once per visit, right after the loading screen finishes
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
