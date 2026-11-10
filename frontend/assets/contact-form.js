/* Interactive "send me a message" form (one question at a time) */
(function () {
  var root = document.getElementById('message'); if (!root) return;
  var MAIL = 'asihfibrahim600@gmail.com';
  var API = (typeof window.PORTFOLIO_API_BASE === 'string') ? window.PORTFOLIO_API_BASE.replace(/\/+$/, '') : '';
  var FS = window.PORTFOLIO_FORMSUBMIT || '';
  var MAX = 1500, TOPICS = ['Hire me', 'Freelance project', 'Collaboration', 'Just saying hi'];
  var STARTERS = ["Hi Asihf, I'd like to discuss a project: ", "We're hiring and your portfolio caught our eye. ", "Loved your work! I wanted to say "];

  root.innerHTML =
    '<div class="cf-wrap">' +
      '<div class="cf-side">' +
        '<div class="cf-kicker">Say hello</div>' +
        '<h2 class="cf-title">Have a project<br><em>in mind?</em></h2>' +
        '<p class="cf-lead">Answer a few quick questions and your message lands straight in my inbox. I usually reply within a day.</p>' +
        '<ul class="cf-points">' +
          '<li><iconify-icon icon="lucide:mail" width="16"></iconify-icon><span>Goes directly to my email</span></li>' +
          '<li><iconify-icon icon="lucide:clock" width="16"></iconify-icon><span>Replies within 24 hours</span></li>' +
          '<li><iconify-icon icon="lucide:shield-check" width="16"></iconify-icon><span>Your details stay private</span></li>' +
        '</ul>' +
      '</div>' +
      '<div class="cf-card" id="cfCard">' +
        '<div class="cf-prog"><i id="cfProg"></i></div>' +
        '<div class="cf-dots" id="cfDots"></div>' +
        '<form id="cfForm" novalidate autocomplete="on">' +
          '<div class="cf-stage" id="cfStage">' +
            '<section class="cf-step" data-k="name"><label for="cfName">What should I call you?</label>' +
              '<input id="cfName" name="name" type="text" maxlength="80" placeholder="Your name" autocomplete="name"><p class="cf-err"></p></section>' +
            '<section class="cf-step" data-k="email"><label for="cfEmail">Where can I reply?</label>' +
              '<input id="cfEmail" name="email" type="email" maxlength="120" placeholder="you@example.com" autocomplete="email" inputmode="email"><p class="cf-err"></p></section>' +
            '<section class="cf-step" data-k="topic"><label>What brings you here?</label>' +
              '<div class="cf-chips" id="cfTopics"></div><p class="cf-err"></p></section>' +
            '<section class="cf-step" data-k="message"><label for="cfMsg">Tell me about it</label>' +
              '<div class="cf-starters" id="cfStarters"></div>' +
              '<textarea id="cfMsg" name="message" rows="5" maxlength="' + MAX + '" placeholder="Write your message here…"></textarea>' +
              '<div class="cf-count"><span id="cfCount">0</span> / ' + MAX + '</div><p class="cf-err"></p></section>' +
            '<section class="cf-step" data-k="review"><label>Looks good? Give it a final check</label>' +
              '<dl class="cf-sum" id="cfSum"></dl><p class="cf-err" id="cfSendErr"></p></section>' +
          '</div>' +
          '<input class="cf-hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
        '</form>' +
        '<div class="cf-nav"><button type="button" class="cf-back" id="cfBack"><iconify-icon icon="lucide:arrow-left" width="15"></iconify-icon> Back</button>' +
          '<button type="button" class="cf-next" id="cfNext"><span id="cfNextTxt">Continue</span> <iconify-icon icon="lucide:arrow-right" width="15"></iconify-icon></button></div>' +
        '<div class="cf-hint" id="cfHint">Press <kbd>Enter</kbd> to continue</div>' +
        '<div class="cf-done" id="cfDone" hidden>' +
          '<svg class="cf-plane" viewBox="0 0 64 64" width="84" height="84"><path d="M6 30 58 6 44 58 31 38 6 30Z" fill="none" stroke="#e6cf9f" stroke-width="2.4" stroke-linejoin="round"/><path d="M31 38 58 6" stroke="#e6cf9f" stroke-width="2.4"/></svg>' +
          '<h3 id="cfDoneTitle">Message sent!</h3><p id="cfDoneText"></p>' +
          '<button type="button" class="cf-again" id="cfAgain">Send another message</button></div>' +
      '</div>' +
    '</div>';

  var $ = function (id) { return document.getElementById(id); };
  var steps = [].slice.call(root.querySelectorAll('.cf-step'));
  var data = { name: '', email: '', topic: '', message: '' }, cur = 0, sending = false, t0 = Date.now();
  var dots = $('cfDots');
  steps.forEach(function (s, i) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'cf-dot'; b.setAttribute('aria-label', 'Step ' + (i + 1));
    b.addEventListener('click', function () { if (i < cur) go(i); }); dots.appendChild(b);
  });
  TOPICS.forEach(function (t) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'cf-chip'; b.textContent = t;
    b.addEventListener('click', function () {
      data.topic = t; [].forEach.call($('cfTopics').children, function (c) { c.classList.toggle('on', c === b); });
      err(2, ''); setTimeout(function () { if (cur === 2) next(); }, 280);
    });
    $('cfTopics').appendChild(b);
  });
  STARTERS.forEach(function (t) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'cf-starter'; b.textContent = t.trim().replace(/[:.]$/, '…');
    b.addEventListener('click', function () { var m = $('cfMsg'); if (!m.value.trim()) { m.value = t; count(); } m.focus(); m.setSelectionRange(m.value.length, m.value.length); });
    $('cfStarters').appendChild(b);
  });

  function err(i, msg) {
    var e = steps[i].querySelector('.cf-err'); if (!e) return;
    e.textContent = msg; steps[i].classList.toggle('bad', !!msg);
    if (msg) { var inp = steps[i].querySelector('input,textarea'); if (inp) { inp.classList.remove('shake'); void inp.offsetWidth; inp.classList.add('shake'); } }
  }
  function count() { var v = $('cfMsg').value.length; $('cfCount').textContent = v; }
  $('cfMsg').addEventListener('input', count);

  function valid(i) {
    if (i === 0) { data.name = $('cfName').value.trim(); if (data.name.length < 2) return err(0, 'Please tell me your name.'), false; }
    if (i === 1) { data.email = $('cfEmail').value.trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) return err(1, 'That email does not look right. Please check it.'), false; }
    if (i === 2) { if (!data.topic) return err(2, 'Pick one so I know how to help.'), false; }
    if (i === 3) { data.message = $('cfMsg').value.trim(); var own = data.message; STARTERS.forEach(function (t) { if (own.indexOf(t.trim()) === 0) own = own.slice(t.trim().length); });
      if (own.trim().length < 8) return err(3, 'Add a few details of your own after the opener, so I know how to help.'), false; }
    err(i, ''); return true;
  }

  function paint(dir) {
    steps.forEach(function (s, i) {
      s.classList.remove('is-on', 'from-l', 'from-r');
      if (i === cur) { s.classList.add('is-on'); if (dir) s.classList.add(dir > 0 ? 'from-r' : 'from-l'); }
    });
    [].forEach.call(dots.children, function (d, i) { d.classList.toggle('on', i === cur); d.classList.toggle('done', i < cur); });
    $('cfProg').style.transform = 'scaleX(' + ((cur + 1) / steps.length) + ')';
    $('cfBack').style.visibility = cur === 0 ? 'hidden' : 'visible';
    var last = cur === steps.length - 1;
    $('cfNextTxt').textContent = last ? 'Send message' : 'Continue';
    $('cfNext').classList.toggle('send', last);
    $('cfNext').querySelector('iconify-icon').setAttribute('icon', last ? 'lucide:send' : 'lucide:arrow-right');
    $('cfHint').style.visibility = (cur === 3) ? 'visible' : 'visible';
    $('cfHint').innerHTML = cur === 3 ? 'Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to continue' : (last ? 'Nothing is sent until you press the button' : 'Press <kbd>Enter</kbd> to continue');
    if (last) summary();
  }
  function focusStep() { var inp = steps[cur].querySelector('input,textarea'); if (inp && matchMedia('(pointer:fine)').matches) setTimeout(function () { inp.focus(); }, 380); }
  function go(i) { var d = i > cur ? 1 : -1; cur = i; paint(d); focusStep(); }
  function next() {
    if (sending) return;
    if (cur === steps.length - 1) return submit();
    if (valid(cur)) go(cur + 1);
  }
  function summary() {
    var rows = [['Name', data.name, 0], ['Email', data.email, 1], ['Topic', data.topic, 2], ['Message', data.message, 3]];
    $('cfSum').innerHTML = '';
    rows.forEach(function (r) {
      var dt = document.createElement('dt'), dd = document.createElement('dd'), ed = document.createElement('button');
      dt.textContent = r[0]; dd.textContent = r[1]; ed.type = 'button'; ed.className = 'cf-edit'; ed.textContent = 'Edit';
      ed.addEventListener('click', function () { go(r[2]); });
      dd.appendChild(ed); $('cfSum').appendChild(dt); $('cfSum').appendChild(dd);
    });
    $('cfSendErr').innerHTML = '';
  }

  $('cfNext').addEventListener('click', next);
  $('cfBack').addEventListener('click', function () { if (cur > 0 && !sending) go(cur - 1); });
  $('cfForm').addEventListener('submit', function (e) { e.preventDefault(); next(); });
  $('cfForm').addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var ta = e.target && e.target.tagName === 'TEXTAREA';
    if (ta && !(e.ctrlKey || e.metaKey)) return;
    e.preventDefault(); next();
  });

  /* ---- sending: backend first, FormSubmit as the backup ---- */
  function post(url, body, ms) {
    var ctl = new AbortController(), timer = setTimeout(function () { ctl.abort(); }, ms || 45000);
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body), signal: ctl.signal })
      .finally(function () { clearTimeout(timer); });
  }
  function deliver() {
    var payload = { name: data.name, email: data.email, topic: data.topic, message: data.message, website: root.querySelector('.cf-hp').value };
    var res = { stored: false, emailed: false, userError: '' };
    return post(API + '/api/message', payload).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.ok) { res.stored = true; res.emailed = !!j.emailed; }
        else if (r.status === 400 || r.status === 429) res.userError = j.error || 'Please check your details and try again.';
      });
    }).catch(function () {}).then(function () {
      if (res.userError || res.emailed || !FS) return res;
      return post('https://formsubmit.co/ajax/' + encodeURIComponent(FS), { name: data.name, email: data.email, topic: data.topic, message: data.message, _replyto: data.email, _subject: 'New portfolio message from ' + data.name, _captcha: 'false', _template: 'table' }, 20000)
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (r.ok && (j.success === true || j.success === 'true')) res.emailed = true; }); })
        .catch(function () {}).then(function () { return res; });
    });
  }
  function submit() {
    if (sending) return;
    for (var i = 0; i < 4; i++) { if (!valid(i)) { go(i); return; } }
    if (root.querySelector('.cf-hp').value) { return finish({ stored: true, emailed: false }); }   // bot
    sending = true; $('cfNext').classList.add('busy'); $('cfNextTxt').textContent = 'Sending…';
    var slow = setTimeout(function () { $('cfNextTxt').textContent = 'Waking up the server…'; }, 6000);
    deliver().then(function (res) {
      clearTimeout(slow); sending = false; $('cfNext').classList.remove('busy');
      if (res.userError) { $('cfNextTxt').textContent = 'Send message'; $('cfSendErr').textContent = res.userError; return; }
      if (!res.stored && !res.emailed) {
        $('cfNextTxt').textContent = 'Try again';
        var body = encodeURIComponent('Name: ' + data.name + '\nEmail: ' + data.email + '\nTopic: ' + data.topic + '\n\n' + data.message);
        $('cfSendErr').innerHTML = 'Could not send right now. <a href="mailto:' + MAIL + '?subject=' + encodeURIComponent('Portfolio message from ' + data.name) + '&body=' + body + '">Open it in your email app instead</a>.';
        return;
      }
      finish(res);
    });
  }
  function finish(res) {
    $('cfForm').style.display = 'none'; root.querySelector('.cf-nav').style.display = 'none'; $('cfHint').style.display = 'none';
    $('cfDone').hidden = false; $('cfCard').classList.add('sent');
    $('cfDoneTitle').textContent = 'Thank you, ' + data.name.split(' ')[0] + '!';
    $('cfDoneText').textContent = res.emailed ? 'Your message is on its way to my inbox. I will reply to ' + data.email + ' soon.' : 'Your message has been received. I will get back to you at ' + data.email + ' soon.';
    $('cfProg').style.transform = 'scaleX(1)';
    var r = $('cfCard').getBoundingClientRect();
    for (var i = 0; i < 26; i++) {
      var p = document.createElement('i'); p.className = 'cf-conf'; p.style.left = (r.width / 2) + 'px'; p.style.top = '120px';
      p.style.setProperty('--dx', (Math.random() * 360 - 180) + 'px'); p.style.setProperty('--dy', (Math.random() * -220 - 40) + 'px'); p.style.setProperty('--r', (Math.random() * 540 - 270) + 'deg');
      p.style.animationDelay = (Math.random() * .25) + 's'; $('cfCard').appendChild(p); (function (n) { setTimeout(function () { n.remove(); }, 2000); })(p);
    }
  }
  $('cfAgain').addEventListener('click', function () {
    data = { name: '', email: '', topic: '', message: '' }; ['cfName', 'cfEmail', 'cfMsg'].forEach(function (id) { $(id).value = ''; });
    [].forEach.call($('cfTopics').children, function (c) { c.classList.remove('on'); }); count();
    $('cfDone').hidden = true; $('cfCard').classList.remove('sent'); $('cfForm').style.display = ''; root.querySelector('.cf-nav').style.display = ''; $('cfHint').style.display = '';
    cur = 0; paint(0);
  });

  /* entrance animation when scrolled into view */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) { en.forEach(function (e) { if (e.isIntersecting) { root.classList.add('in'); io.disconnect(); } }); }, { threshold: .15 });
    io.observe(root);
  } else root.classList.add('in');
  paint(0);
})();
