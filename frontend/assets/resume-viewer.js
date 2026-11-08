/* Resume viewer: "My Resume" button in the hero opens an animated modal with the PDF.
 * Put the PDF at frontend/assets/resume.pdf
 * (or set window.PORTFOLIO_RESUME_URL in config.js to another path/link).
 * - On phones/tablets the PDF is opened with a button (many mobile browsers can't show PDFs in a frame).
 * - On desktop, if the browser can't display the PDF, a link to open it in a new tab sits behind the frame.
 * - If the intro narration is open when the button is pressed, the intro is closed first.
 */
(function () {
  'use strict';

  var RESUME_URL = window.PORTFOLIO_RESUME_URL || 'assets/resume.pdf';
  var RESUME_NAME = 'Mohamad_Asihf_Resume.pdf';
  var touch = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  var wrap = document.createElement('div');
  wrap.id = 'rvWrap';
  wrap.setAttribute('role', 'dialog');
  wrap.setAttribute('aria-modal', 'true');
  wrap.setAttribute('aria-label', 'Resume');
  wrap.innerHTML =
    '<div class="rv-backdrop" data-close="1"></div>' +
    '<div class="rv-panel">' +
      '<div class="rv-head">' +
        '<div class="rv-title"><span class="rv-kicker">Curriculum vitae</span><span class="rv-name">Mohamad Asihf</span></div>' +
        '<div class="rv-actions">' +
          '<a class="rv-btn" href="' + RESUME_URL + '" download="' + RESUME_NAME + '">Download PDF</a>' +
          '<a class="rv-btn rv-btn-ghost" href="' + RESUME_URL + '" target="_blank" rel="noopener">Open</a>' +
          '<button type="button" class="rv-close" id="rvClose" aria-label="Close resume">&times;</button>' +
        '</div>' +
      '</div>' +
      '<div class="rv-body">' +
        (touch
          ? '<div class="rv-fallback"><p>Tap below to view the resume.</p>' +
            '<a class="rv-btn" href="' + RESUME_URL + '" target="_blank" rel="noopener">View resume</a></div>'
          : '<div class="rv-fallback"><p>Trouble seeing the PDF?</p>' +
            '<a class="rv-btn" href="' + RESUME_URL + '" target="_blank" rel="noopener">Open resume in a new tab</a></div>' +
            '<iframe id="rvFrame" title="Mohamad Asihf resume"></iframe>') +
      '</div>' +
    '</div>';
  document.body.appendChild(wrap);

  function open() {
    // close the intro narration first if it is showing, so it can't cover the resume
    var iv = document.getElementById('ivWrap');
    if (iv && iv.classList.contains('open')) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    }
    var frame = document.getElementById('rvFrame');
    if (frame && !frame.getAttribute('src')) frame.src = RESUME_URL;   // load the PDF only when needed
    wrap.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(function () { var c = document.getElementById('rvClose'); if (c) c.focus(); }, 80);
  }

  function close() {
    wrap.classList.remove('open');
    document.body.style.overflow = '';
  }

  wrap.addEventListener('click', function (e) {
    if (e.target.getAttribute && e.target.getAttribute('data-close')) return close();
    if (e.target.closest && e.target.closest('#rvClose')) return close();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && wrap.classList.contains('open')) close();
  });

  // Hero button (delegated, so it always works)
  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('#resumeOpen') : null;
    if (!btn) return;
    e.preventDefault();
    open();
  });

  var ctas = document.getElementById('heroCtas');
  if (ctas && !document.getElementById('resumeOpen')) {
    var b = document.createElement('button');
    b.type = 'button';
    b.id = 'resumeOpen';
    b.className = 'rv-hero-btn hoverable';
    b.innerHTML = '<iconify-icon icon="lucide:file-text" width="14"></iconify-icon> My Resume';
    ctas.insertBefore(b, ctas.firstChild);
  }
})();
