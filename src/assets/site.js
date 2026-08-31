(() => {
  const navToggle = document.querySelector('.nav-more-toggle');
  const navMenu = document.querySelector('#nav-more-menu');

  function closeNav() {
    if (!navToggle || !navMenu) return;
    navToggle.setAttribute('aria-expanded', 'false');
    navMenu.hidden = true;
  }

  navToggle?.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') === 'true';
    navToggle.setAttribute('aria-expanded', String(!expanded));
    navMenu.hidden = expanded;
  });

  document.addEventListener('click', (event) => {
    if (navToggle && navMenu && !navToggle.contains(event.target) && !navMenu.contains(event.target)) closeNav();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeNav();
  });

  document.querySelectorAll('[data-privacy-settings]').forEach((link) => {
    link.addEventListener('click', (event) => {
      if (!window.googlefc?.showRevocationMessage) return;
      event.preventDefault();
      window.googlefc.showRevocationMessage();
    });
  });
})();
