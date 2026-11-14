/* Progressive enhancement: keyboard viewport and accessible off-canvas controls. */
(() => {
  const panel = document.getElementById('mobileControlsPanel');
  const toggle = document.getElementById('mobileControlsToggle');
  const close = document.getElementById('mobileControlsClose');
  if (!panel || !toggle || !close) return;
  const mobile = window.matchMedia('(max-width: 980px)');
  let previousFocus = null;
  let wasOpen = false;
  let frame = 0;
  const updateHeight = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.documentElement.style.setProperty('--qg-visible-height', `${Math.round(height)}px`);
    });
  };
  updateHeight();
  window.addEventListener('resize', updateHeight, { passive: true });
  if (window.visualViewport) window.visualViewport.addEventListener('resize', updateHeight, { passive: true });
  panel.setAttribute('role', 'dialog');
  panel.setAttribute('aria-label', 'Search and filter collections');
  toggle.setAttribute('aria-controls', panel.id);
  const sync = () => {
    const open = mobile.matches && panel.classList.contains('open');
    toggle.setAttribute('aria-expanded', String(open));
    panel.setAttribute('aria-hidden', String(!open));
    panel.inert = !open;
    if (open) panel.setAttribute('aria-modal', 'true');
    else panel.removeAttribute('aria-modal');
    if (open && !wasOpen) {
      previousFocus = document.activeElement;
      close.focus({ preventScroll: true });
    } else if (!open && wasOpen && previousFocus && previousFocus.isConnected) {
      previousFocus.focus({ preventScroll: true });
    }
    wasOpen = open;
  };
  new MutationObserver(sync).observe(panel, { attributes: true, attributeFilter: ['class'] });
  panel.addEventListener('keydown', event => {
    if (!wasOpen) return;
    if (event.key === 'Escape') { event.preventDefault(); close.click(); return; }
    if (event.key !== 'Tab') return;
    const elements = [...panel.querySelectorAll('button,input,select,textarea,a[href]')]
      .filter(element => !element.disabled && element.getClientRects().length);
    const first = elements[0], last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  if (mobile.addEventListener) mobile.addEventListener('change', sync);
  else mobile.addListener(sync);
  sync();
})();
