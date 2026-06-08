import { moduleRegistry } from './modules.js?v=0.1.13';

const index = [
  { route: 'dashboard', title: 'Home', description: 'Suite dashboard and module launcher.', terms: 'home dashboard modules apps launcher lazy acres suite' },
  { route: 'today', title: 'Today', description: 'Calendar, weather, recent activity, and shopping status.', terms: 'today active calendar weather recent activity shopping list events schedule' },
  ...moduleRegistry.map((m) => ({ route: m.slug, title: m.title, description: m.description, terms: [m.slug, m.title, m.shortTitle, m.description, m.group].filter(Boolean).join(' ') })),
];

function norm(value) {
  return String(value || '').toLowerCase().trim();
}

function score(item, query) {
  const q = norm(query);
  if (!q) return 0;
  const title = norm(item.title);
  const route = norm(item.route);
  const haystack = norm(`${item.title} ${item.description} ${item.terms}`);
  const words = q.split(/\s+/).filter(Boolean);
  let total = 0;
  if (title === q || route === q) total += 100;
  if (title.startsWith(q) || route.startsWith(q)) total += 50;
  if (title.includes(q) || route.includes(q)) total += 25;
  words.forEach((word) => {
    if (title.includes(word)) total += 12;
    if (route.includes(word)) total += 10;
    if (haystack.includes(word)) total += 4;
  });
  return total;
}

function matches(query) {
  return index.map((item) => ({ ...item, score: score(item, query) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title)).slice(0, 6);
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
  const results = document.createElement('div');
  results.className = 'command-results';
  results.hidden = true;
  Object.assign(results.style, { position: 'absolute', top: 'calc(100% + 10px)', left: '0', right: '0', zIndex: '50', display: 'grid', gap: '6px', borderRadius: '20px', padding: '10px', background: 'color-mix(in srgb, var(--panel-solid) 94%, transparent)', boxShadow: 'var(--shadow)', backdropFilter: 'blur(18px)' });
  commandBar.appendChild(results);
  let current = [];
  input.addEventListener('input', () => {
    current = matches(input.value);
    results.hidden = !input.value.trim();
    results.innerHTML = current.length ? current.map((item, i) => `<button class="command-result" type="button" data-search-route="${item.route}" style="border:0;border-radius:14px;display:grid;gap:2px;padding:10px 12px;text-align:left;background:color-mix(in srgb,var(--surface-raised) 84%,transparent);color:var(--ink);cursor:pointer;box-shadow:var(--inner-light),var(--inner-shade);position:relative"><strong>${item.title}</strong><span style="color:var(--muted);font-size:.82rem">${item.description}</span>${i === 0 ? '<em style="position:absolute;right:12px;top:10px;color:var(--muted);font-style:normal;font-size:.72rem;font-weight:800">Enter</em>' : ''}</button>`).join('') : '<p style="color:var(--muted);font-size:.82rem;margin:0">No suite matches yet.</p>';
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && current.length) {
      event.preventDefault();
      window.location.hash = `#/${current[0].route}`;
      input.value = '';
      results.hidden = true;
    }
    if (event.key === 'Escape') {
      input.value = '';
      results.hidden = true;
      input.blur();
    }
  });
  results.addEventListener('click', (event) => {
    const button = event.target.closest('[data-search-route]');
    if (!button) return;
    window.location.hash = `#/${button.dataset.searchRoute}`;
    input.value = '';
    results.hidden = true;
  });
  document.addEventListener('click', (event) => {
    if (!commandBar.contains(event.target)) results.hidden = true;
  });
}

if (!window.__lazyAcresSearchShortcutBound) {
  window.__lazyAcresSearchShortcutBound = true;
  window.addEventListener('keydown', (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return;
    event.preventDefault();
    document.querySelector('.command-bar input[type="search"]')?.focus();
  });
}

enhanceCommandBar();
new MutationObserver(() => enhanceCommandBar()).observe(document.documentElement, { childList: true, subtree: true });
