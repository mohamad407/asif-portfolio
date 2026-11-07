/* Mobile project viewer: open projects in "Mobile" preview by default on phones.
 * Works with the existing viewer in index.html (wraps window.openProject). */
(function () {
  'use strict';

  function isPhone() {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  function showMobilePreview() {
    if (!isPhone()) return;
    var btn = document.querySelector('#pmSeg button[data-mode="mobile"]');
    if (btn && !btn.classList.contains('on')) btn.click();
  }

  function wrap() {
    if (typeof window.openProject !== 'function') return false;
    var original = window.openProject;
    window.openProject = function (i) {
      original.apply(this, arguments);
      // the original sets Desktop mode; switch to Mobile right after it
      setTimeout(showMobilePreview, 0);
    };
    return true;
  }

  if (!wrap()) window.addEventListener('load', wrap);
})();
