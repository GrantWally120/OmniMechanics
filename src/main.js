(function () {
  'use strict';
  function boot() {
    if (!OM.mods.length) throw new Error('No mechanisms registered');
    OM.ui.start();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
