/* Mobile project viewer helpers:
 *  - opens projects in the "Mobile" preview on phones
 *  - makes every tap on a project card open it reliably, even if a previous
 *    viewer was still closing (its fade-out could otherwise hide the new one)
 * Works with the viewer in index.html by wrapping window.openProject.
 */
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
      // cancel any pending "close" fade so it can't remove the viewer we are about to open
      if (window.gsap) {
        var pm = document.getElementById('pm');
        if (pm) gsap.killTweensOf(pm);
        gsap.killTweensOf('.pm-bar');
        gsap.killTweensOf('#pmStage');
      }
      original.apply(this, arguments);
      setTimeout(showMobilePreview, 0);
    };
    return true;
  }

  if (!wrap()) window.addEventListener('load', wrap);
})();
