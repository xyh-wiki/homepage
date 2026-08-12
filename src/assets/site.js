(() => {
  const list = document.querySelector('[data-service-list]');
  if (!list) return;

  const search = document.querySelector('#service-search');
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

    if (summary) summary.textContent = `显示 ${visible} 项服务`;
    if (empty) empty.hidden = visible !== 0;
  }

  search?.addEventListener('input', render);
  filters.forEach((button) => {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter ?? 'all';
      filters.forEach((item) => item.classList.toggle('is-active', item === button));
      render();
    });
  });
})();
