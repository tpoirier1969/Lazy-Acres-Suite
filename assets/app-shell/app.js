import { authService } from './auth.js?v=0.1.4';
import { entitlementService } from './entitlements.js?v=0.1.4';
import { getModuleBySlug, moduleRegistry } from './modules.js?v=0.1.4';
import { bindHashRouter, navigateTo, routeToHash } from './router.js?v=0.1.4';

const APP_VERSION = 'v0.1.4';
const LIVE_BASE_URL = 'https://tpoirier1969.github.io/Lazy-Acres-Suite/';
const APP_ICON_URL = 'https://tpoirier1969.github.io/Lazy-Acres-Home/apple-touch-icon.png?v=0.1.4';
const THEME_STORAGE_KEY = 'lazy-acres-suite-theme-mode';
const appRoot = document.querySelector('[data-app-shell-root]');

let activeRoute = 'dashboard';
let themeMode = getStoredThemeMode();
let activeResolvedTheme = null;

const MODULE_ICONS = {
  shopping: '<path d="M6 7h13l-1.2 7.5a2 2 0 0 1-2 1.7H8.2a2 2 0 0 1-2-1.7L5 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/><path d="M9 20h.1M16 20h.1"/>',
  scheduler: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14h2M13 14h2M8 17h2"/>',
  recipes: '<path d="M5 12h14l-1.2 5a3 3 0 0 1-3 2.3H9.2a3 3 0 0 1-3-2.3L5 12Z"/><path d="M8 12c.3-2 1.7-3 4-3s3.7 1 4 3M10 7c-.5-1.2-.2-2.2 1-3M14 7c.5-1.2.2-2.2-1-3"/>',
  tv: '<rect x="4" y="7" width="16" height="11" rx="2"/><path d="M8 21h8M9 4l3 3 3-3"/><path d="M8 11h8v3H8z"/>',
  ski: '<path d="M4 18 10 8l4 6 2-3 4 7H4Z"/><path d="M6 21c4-2 8-2 12 0M9 15l2 2M15 16l2 2"/>',
  'church-music': '<path d="M9 18a2 2 0 1 1-2-2h2V5l9-2v11"/><path d="M18 16a2 2 0 1 1-2-2h2"/><path d="M9 8l9-2"/>',
  foraging: '<path d="M12 21c0-6 2-10 7-14-6 1-11 5-12 11 2-1 4-1 5 3Z"/><path d="M4 13c3-1 6-1 9 1M12 21c-1-4-3-7-7-9"/>',
  camping: '<path d="M4 19 12 5l8 14H4Z"/><path d="M12 5v14M9 19l3-5 3 5"/><path d="M4 19h16"/>',
  fishing: '<path d="M3 12s4-5 9-5 9 5 9 5-4 5-9 5-9-5-9-5Z"/><path d="M17 12l4-4v8l-4-4Z"/><circle cx="9" cy="11" r=".6"/><path d="M5 20c3-2 6-2 9 0"/>',
  genealogy: '<path d="M12 20V8M7 20h10M12 8c-2-3-6-3-8 0 3 .2 5 1.5 8 0ZM12 8c2-3 6-3 8 0-3 .2-5 1.5-8 0Z"/><path d="M8 13c-2-2-4-2-6 0 2 .3 4 1 6 0ZM16 13c2-2 4-2 6 0-2 .3-4 1-6 0Z"/>',
};

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getLiveModuleUrl(slug) {
  return `${LIVE_BASE_URL}#/${slug}`;
}

function getStoredThemeMode() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return ['auto', 'field', 'aurora'].includes(stored) ? stored : 'auto';
}

function getAutoTheme() {
  const hour = new Date().getHours();
  return hour >= 19 || hour < 7 ? 'aurora' : 'field';
}

function resolveTheme(mode = themeMode) {
  return mode === 'auto' ? getAutoTheme() : mode;
}

function getThemeLabel(mode = themeMode) {
  const resolved = resolveTheme(mode);
  if (mode === 'auto') {
    return `Auto · ${resolved === 'aurora' ? 'Aurora' : 'Field'}`;
  }

  return resolved === 'aurora' ? 'Aurora' : 'Field';
}

function applyTheme() {
  const resolvedTheme = resolveTheme();
  activeResolvedTheme = resolvedTheme;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themeMode = themeMode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'aurora' ? '#081116' : '#315f48');
  return resolvedTheme;
}

function setThemeMode(nextMode) {
  if (!['auto', 'field', 'aurora'].includes(nextMode)) return;
  themeMode = nextMode;
  localStorage.setItem(THEME_STORAGE_KEY, nextMode);
  applyTheme();
  renderRoute(activeRoute).catch(showRenderError);
}

function getModuleAccent(appModule) {
  return activeResolvedTheme === 'aurora' ? appModule.accentDark : appModule.accentLight;
}

function renderModuleIcon(slug) {
  const icon = MODULE_ICONS[slug] || '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>';
  return `<span class="module-icon" aria-hidden="true"><svg viewBox="0 0 24 24" role="img">${icon}</svg></span>`;
}

function renderNavItem({ label, icon, route }) {
  const selected = route === activeRoute || (route === 'dashboard' && activeRoute === 'dashboard');
  return `<button class="nav-item${selected ? ' nav-item-active' : ''}" type="button" data-route="${escapeHtml(route)}"><span aria-hidden="true">${icon}</span><span>${escapeHtml(label)}</span></button>`;
}

function renderThemeControl() {
  const options = [
    ['auto', getThemeLabel('auto')],
    ['field', 'Field'],
    ['aurora', 'Aurora'],
  ];

  return `
    <div class="theme-control" role="group" aria-label="Theme mode">
      ${options
        .map(
          ([mode, label]) => `<button class="theme-option${themeMode === mode ? ' theme-option-active' : ''}" type="button" data-theme-mode="${mode}">${escapeHtml(label)}</button>`,
        )
        .join('')}
    </div>
  `;
}

function renderShell(content) {
  applyTheme();

  appRoot.innerHTML = `
    <div class="app-shell">
      <header class="suite-header">
        <a class="brand" href="${routeToHash('dashboard')}" aria-label="Lazy Acres Suite dashboard">
          <img class="brand-icon" src="${APP_ICON_URL}" alt="" aria-hidden="true" />
          <span>
            <strong>Lazy Acres Suite</strong>
            <small>Home base</small>
          </span>
        </a>
        <label class="command-bar" aria-label="Search or type a command">
          <span aria-hidden="true">⌕</span>
          <input type="search" placeholder="Search or type a command…" disabled />
          <kbd>⌘ K</kbd>
        </label>
        <div class="header-actions">
          ${renderThemeControl()}
          <span class="version-flag" aria-label="App version">${escapeHtml(APP_VERSION)}</span>
        </div>
      </header>

      <div class="layout-grid">
        <aside class="side-rail" aria-label="Suite navigation">
          <nav>
            ${renderNavItem({ label: 'Home', icon: '⌂', route: 'dashboard' })}
            ${renderNavItem({ label: 'Today', icon: '◷', route: 'scheduler' })}
            ${renderNavItem({ label: 'Maps', icon: '◇', route: 'camping' })}
            ${renderNavItem({ label: 'Logs', icon: '☷', route: 'fishing' })}
            ${renderNavItem({ label: 'Library', icon: '▤', route: 'recipes' })}
            ${renderNavItem({ label: 'TV', icon: '▣', route: 'tv' })}
          </nav>
          <div class="rail-status">
            <strong>52°</strong>
            <span>Fog & Calm</span>
            <small>All systems nominal</small>
          </div>
        </aside>
        ${content}
      </div>
    </div>
  `;
}

function renderCopyButton(appModule, className = 'button button-secondary') {
  return `<button class="${className}" type="button" data-copy-url="${escapeHtml(getLiveModuleUrl(appModule.slug))}">Copy link</button>`;
}

function renderAppCard(appModule) {
  const accent = getModuleAccent(appModule);

  return `
    <article class="module-card module-${escapeHtml(appModule.slug)}" style="--module-accent: ${escapeHtml(accent)};">
      <div class="module-card__body">
        ${renderModuleIcon(appModule.slug)}
        <h3>${escapeHtml(appModule.shortTitle || appModule.title)}</h3>
        <p>${escapeHtml(appModule.description)}</p>
      </div>
      <div class="module-card__footer">
        <span>${escapeHtml(appModule.metric || '')}</span>
        <a class="icon-action" href="${routeToHash(appModule.slug)}" aria-label="Details for ${escapeHtml(appModule.title)}">→</a>
      </div>
      <div class="module-card__actions">
        ${renderLegacyLink(appModule, 'button button-primary')}
        ${renderCopyButton(appModule)}
      </div>
    </article>
  `;
}

function renderDashboard() {
  const cards = moduleRegistry.map(renderAppCard).join('');

  return `
    <main class="dashboard">
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">${activeResolvedTheme === 'aurora' ? 'Aurora Utility' : 'Field Lab'}</p>
          <h1>Good morning, Tod.</h1>
          <p>One home base for the apps we use, test, and eventually grow.</p>
          <div class="hero-stats" aria-label="Today at a glance">
            <span><strong>3</strong> active items</span>
            <span><strong>2</strong> events today</span>
            <span><strong>7</strong> tasks due</span>
          </div>
        </div>
        <div class="hero-actions">
          <button class="button button-primary membrane-large" type="button" data-route="scheduler">Open Today</button>
          <button class="button button-secondary membrane-large" type="button" data-route="camping">Open Maps</button>
        </div>
      </section>

      <section class="module-group" aria-label="Apps">
        <div class="module-group__header">
          <h2>Your Modules</h2>
          <p>${getThemeLabel()} theme active</p>
        </div>
        <div class="module-grid">${cards}</div>
      </section>

      <section class="insight-grid" aria-label="Quick panels">
        <article class="insight-card">
          <h3>Recent Activity</h3>
          <ul>
            <li>Logged catch: Rainbow Trout</li>
            <li>Event: Stake Vendor Fire</li>
            <li>Added recipe: Dutch Oven Bread</li>
          </ul>
        </article>
        <article class="insight-card observation-card">
          <h3>Notes & Observations</h3>
          <p>Foggy start with clearing expected by midday. Good day for trail work and campfire prep.</p>
        </article>
        <article class="insight-card quick-capture">
          <h3>Quick Capture</h3>
          <div>
            <button class="capture-button" type="button">Note</button>
            <button class="capture-button" type="button">Photo</button>
            <button class="capture-button" type="button">Location</button>
            <button class="capture-button" type="button">Log</button>
          </div>
        </article>
      </section>
    </main>
  `;
}

function renderLegacyLink(appModule, className) {
  if (!appModule.legacyUrl) {
    return `<button class="${className}" type="button" disabled>${escapeHtml(appModule.legacyLabel || 'Open')}</button>`;
  }

  return `<a class="${className}" href="${escapeHtml(appModule.legacyUrl)}" rel="noopener noreferrer">${escapeHtml(appModule.legacyLabel || 'Open')}</a>`;
}

function renderModule(appModule) {
  const accent = getModuleAccent(appModule);

  return `
    <main class="module-detail">
      <article class="placeholder-card" style="--module-accent: ${escapeHtml(accent)};">
        ${renderModuleIcon(appModule.slug)}
        <h1>${escapeHtml(appModule.title)}</h1>
        <p>${escapeHtml(appModule.description)}</p>

        <div class="detail-actions">
          ${renderLegacyLink(appModule, 'button button-primary')}
          ${renderCopyButton(appModule)}
          <button class="button button-secondary" type="button" data-route="dashboard">Back to dashboard</button>
        </div>
      </article>
    </main>
  `;
}

function renderNotFound(route) {
  return `
    <main class="module-detail">
      <article class="placeholder-card">
        <h1>No app found for /#/${escapeHtml(route)}</h1>
        <p>Use the dashboard to choose one of the available apps.</p>
        <div class="detail-actions">
          <button class="button button-primary" type="button" data-route="dashboard">Back to dashboard</button>
        </div>
      </article>
    </main>
  `;
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand('copy');
  textarea.remove();

  if (!copied) {
    throw new Error('Copy command failed.');
  }
}

function showCopyFeedback(button, message) {
  const originalText = button.dataset.originalText || button.textContent;
  button.dataset.originalText = originalText;
  button.textContent = message;
  button.disabled = true;

  window.clearTimeout(button._copyTimer);
  button._copyTimer = window.setTimeout(() => {
    button.textContent = button.dataset.originalText;
    button.disabled = false;
  }, 1600);
}

function bindCopyButtons() {
  appRoot.querySelectorAll('[data-copy-url]').forEach((button) => {
    button.addEventListener('click', async () => {
      try {
        await copyTextToClipboard(button.dataset.copyUrl);
        showCopyFeedback(button, 'Copied');
      } catch (error) {
        console.error(error);
        showCopyFeedback(button, 'Copy failed');
      }
    });
  });
}

function bindRouteButtons() {
  appRoot.querySelectorAll('[data-route]').forEach((button) => {
    button.addEventListener('click', () => navigateTo(button.dataset.route));
  });
}

function bindThemeButtons() {
  appRoot.querySelectorAll('[data-theme-mode]').forEach((button) => {
    button.addEventListener('click', () => setThemeMode(button.dataset.themeMode));
  });
}

function showRenderError(error) {
  console.error(error);
  appRoot.innerHTML = '<main class="no-script"><h1>App shell error</h1><p>Check the browser console for details.</p></main>';
}

async function renderRoute(route) {
  activeRoute = route;
  applyTheme();
  const user = await authService.getCurrentUser();
  await entitlementService.listVisibleModules(user, moduleRegistry);
  const appModule = getModuleBySlug(route);

  let content;
  if (route === 'dashboard') {
    content = renderDashboard();
  } else if (appModule) {
    content = renderModule(appModule);
  } else {
    content = renderNotFound(route);
  }

  renderShell(content);
  bindRouteButtons();
  bindThemeButtons();
  bindCopyButtons();
}

if (!appRoot) {
  throw new Error('Missing app shell root element.');
}

applyTheme();
bindHashRouter((route) => {
  renderRoute(route).catch(showRenderError);
});

window.setInterval(() => {
  if (themeMode !== 'auto') return;
  const nextTheme = resolveTheme('auto');
  if (nextTheme !== activeResolvedTheme) {
    renderRoute(activeRoute).catch(showRenderError);
  }
}, 60_000);
