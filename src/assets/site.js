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
    if (event.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      const input = document.querySelector('#service-search');
      if (input) { event.preventDefault(); input.focus(); }
    }
  });

  const list = document.querySelector('[data-service-list]');
  if (!list) return;

  const search = document.querySelector('#service-search');
  const clear = document.querySelector('.search-clear');
  const clearResults = document.querySelector('[data-clear-results]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const rows = [...list.querySelectorAll('[data-service-row]')];
  const summary = document.querySelector('#service-results');
  const empty = document.querySelector('[data-empty-results]');
  let activeFilter = 'all';

  const normalize = (value) => value.trim().toLocaleLowerCase('zh-CN');

  function render() {
    const query = normalize(search?.value ?? '');
    let visible = 0;

    rows.forEach((row) => {
      const categoryMatches = activeFilter === 'all' || row.dataset.category === activeFilter;
      const queryMatches = !query || normalize(row.dataset.search ?? '').includes(query);
      const show = categoryMatches && queryMatches;
      row.hidden = !show;
      if (show) visible += 1;
    });

    if (summary) summary.textContent = `显示 ${visible} 个项目`;
    if (empty) empty.hidden = visible !== 0;
    if (clear) clear.hidden = !query;
  }

  search?.addEventListener('input', render);
  clear?.addEventListener('click', () => {
    if (!search) return;
    search.value = '';
    search.focus();
    render();
  });
  clearResults?.addEventListener('click', () => {
    if (search) search.value = '';
    activeFilter = 'all';
    filters.forEach((item) => {
      item.classList.toggle('is-active', item.dataset.filter === 'all');
      item.setAttribute('aria-pressed', String(item.dataset.filter === 'all'));
    });
    render();
    search?.focus();
  });
  filters.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter ?? 'all';
      filters.forEach((item) => {
        item.classList.toggle('is-active', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      });
      render();
    });
  });
})();
