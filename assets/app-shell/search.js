import { moduleRegistry } from './modules.js?v=0.1.5';

const SEARCH_INDEX = [
  {
    route: 'dashboard',
    title: 'Home',
    description: 'Suite dashboard and module launcher.',
    terms: 'home dashboard modules apps launcher lazy acres suite',
  },
  {
    route: 'today',
    title: 'Today',
    description: 'Calendar, weather, observations, recent activity, and shopping snapshot.',
    terms: 'today active calendar weather observations recent activity shopping list events schedule',
  },
  ...moduleRegistry.map((appModule) => ({
    route: appModule.slug,
    title: appModule.title,
    description: appModule.description,
    terms: [
      appModule.slug,
      appModule.title,
      appModule.shortTitle,
      appModule.description,
      appModule.metric,
      appModule.group,
    ].filter(Boolean).join(' '),
  })),
];

function normalize(value) {
  return String(value || '').toLowerCase().trim();
}

function scoreItem(item, query) {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return 0;

  const haystack = normalize(`${item.title} ${item.description} ${item.terms}`);
  const title = normalize(item.title);
  const route = normalize(item.route);
  const words = normalizedQuery.split(/\s+/).filter(Boolean);
  let score = 0;

  if (title === normalizedQuery || route === normalizedQuery) score += 100;
  if (title.startsWith(normalizedQuery) || route.startsWith(normalizedQuery)) score += 50;
  if (title.includes(normalizedQuery) || route.includes(normalizedQuery)) score += 25;

  for (const word of words) {
    if (title.includes(word)) score += 12;
    if (route.includes(word)) score += 10;
    if (haystack.includes(word)) score += 4;
  }

  return score;
}

function getMatches(query) {
  return SEARCH_INDEX
    .map((item) => ({ ...item, score: scoreItem(item, query) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, 6);
}

function navigateToResult(route) {
  window.location.hash = `#/${route}`;
}

function styleResultsBox(resultsBox) {
  Object.assign(resultsBox.style, {
    position: 'absolute',
    top: 'calc(100% + 10px)',
    left: '0',
    right: '0',
    zIndex: '50',
    display: 'grid',
    gap: '6px',
    borderRadius: '20px',
    padding: '10px',
    background: 'color-mix(in srgb, var(--panel-solid) 94%, transparent)',
    boxShadow: 'var(--shadow)',
    backdropFilter: 'blur(18px)',
  });
}

function renderResults(resultsBox, matches, query) {
  if (!query.trim()) {
    resultsBox.hidden = true;
    resultsBox.innerHTML = '';
    return;
  }

  if (!matches.length) {
    resultsBox.hidden = false;
    resultsBox.innerHTML = '<p class="command-result-empty">No suite matches yet.</p>';
    return;
  }

  resultsBox.hidden = false;
  resultsBox.innerHTML = matches.map((match, index) => `
    <button class="command-result" type="button" data-search-route="${match.route}">
      <strong>${match.title}</strong>
      <span>${match.description}</span>
      ${index === 0 ? '<em>Enter</em>' : ''}
    </button>
  `).join('');
}

function styleResultElements(resultsBox) {
  resultsBox.querySelectorAll('.command-result').forEach((button) => {
    Object.assign(button.style, {
      border: '0',
      borderRadius: '14px',
      display: 'grid',
      gap: '2px',
      padding: '10px 12px',
      textAlign: 'left',
      background: 'color-mix(in srgb, var(--surface-raised) 84%, transparent)',
      color: 'var(--ink)',
      cursor: 'pointer',
      boxShadow: 'var(--inner-light), var(--inner-shade)',
      position: 'relative',
    });
  });

  resultsBox.querySelectorAll('.command-result span, .command-result-empty').forEach((element) => {
    Object.assign(element.style, {
      color: 'var(--muted)',
      fontSize: '0.82rem',
      margin: '0',
    });
  });

  resultsBox.querySelectorAll('.command-result em').forEach((element) => {
    Object.assign(element.style, {
      position: 'absolute',
      right: '12px',
      top: '10px',
      color: 'var(--muted)',
      fontStyle: 'normal',
      fontSize: '0.72rem',
      fontWeight: '800',
    });
  });
}

function enhanceCommandBar() {
  const commandBar = document.querySelector('.command-bar');
  const input = commandBar?.querySelector('input[type="search"]');
  if (!commandBar || !input || input.dataset.searchEnhanced === 'true') return;

  input.dataset.searchEnhanced = 'true';
  input.disabled = false;
  input.placeholder = 'Search apps or Today…';
  input.setAttribute('autocomplete', 'off');
  commandBar.style.position = 'relative';

  const kbd = commandBar.querySelector('kbd');
  if (kbd) kbd.textContent = 'Enter';

  const resultsBox = document.createElement('div');
  resultsBox.className = 'command-results';
  resultsBox.hidden = true;
  styleResultsBox(resultsBox);
  commandBar.appendChild(resultsBox);

  let currentMatches = [];

  input.addEventListener('input', () => {
    currentMatches = getMatches(input.value);
    renderResults(resultsBox, currentMatches, input.value);
    styleResultElements(resultsBox);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && currentMatches.length) {
      event.preventDefault();
      navigateToResult(currentMatches[0].route);
      input.value = '';
      resultsBox.hidden = true;
    }

    if (event.key === 'Escape') {
      input.value = '';
      resultsBox.hidden = true;
      input.blur();
    }
  });

  resultsBox.addEventListener('click', (event) => {
    const button = event.target.closest('[data-search-route]');
    if (!button) return;
    navigateToResult(button.dataset.searchRoute);
    input.value = '';
    resultsBox.hidden = true;
  });

  document.addEventListener('click', (event) => {
    if (!commandBar.contains(event.target)) resultsBox.hidden = true;
  });
}

function bindKeyboardShortcut() {
  if (window.__lazyAcresSearchShortcutBound) return;
  window.__lazyAcresSearchShortcutBound = true;

  window.addEventListener('keydown', (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
    event.preventDefault();
    document.querySelector('.command-bar input[type="search"]')?.focus();
  });
}

bindKeyboardShortcut();

enhanceCommandBar();

const observer = new MutationObserver(() => enhanceCommandBar());
observer.observe(document.documentElement, { childList: true, subtree: true });
