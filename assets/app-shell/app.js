import { authService } from './auth.js?v=0.1.6';
import { entitlementService } from './entitlements.js?v=0.1.6';
import { getDashboardSnapshot } from './dashboard-data.js?v=0.1.6';
import { getModuleBySlug, moduleRegistry } from './modules.js?v=0.1.6';
import { bindHashRouter, navigateTo, routeToHash } from './router.js?v=0.1.6';

const APP_VERSION = 'v0.1.6';
const LIVE_BASE_URL = 'https://tpoirier1969.github.io/Lazy-Acres-Suite/';
const APP_ICON_URL = './assets/app-shell/lazy-acres-suite-icon.svg?v=0.1.6';
const THEME_STORAGE_KEY = 'lazy-acres-suite-theme-mode';
const appRoot = document.querySelector('[data-app-shell-root]');

let activeRoute = 'dashboard';
let themeMode = getStoredThemeMode();
let activeResolvedTheme = null;
let dashboardSnapshot = null;

const MODULE_ICONS = {
  shopping: '<path d="M6.5 8.8h11l-1.2 8.2a2.6 2.6 0 0 1-2.6 2.2H10.3A2.6 2.6 0 0 1 7.7 17L6.5 8.8Z" fill="currentColor" opacity=".16"/><path d="M8.5 9.1c.6-3 2-4.4 3.5-4.4s2.9 1.4 3.5 4.4" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M16.7 11.2c2-.7 3.2 0 3.8 1.2-1.8.5-3 .2-3.8-1.2ZM7.3 11.5c-2-.4-3.2.5-3.5 1.8 1.9.2 3-.3 3.5-1.8Z" fill="currentColor" opacity=".34"/><path d="M8.2 13h7.6M8.7 15.4h6.6" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity=".45"/>',
  scheduler: '<rect x="4.3" y="5.2" width="15.4" height="14.8" rx="3.2" fill="currentColor" opacity=".14"/><path d="M7.8 3.8v3.3M16.2 3.8v3.3M5 9.6h14" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><rect x="7.1" y="12" width="3.1" height="3.1" rx="1" fill="currentColor" opacity=".46"/><rect x="11" y="12" width="3.1" height="3.1" rx="1" fill="currentColor" opacity=".28"/><rect x="14.9" y="12" width="3.1" height="3.1" rx="1" fill="currentColor" opacity=".2"/><path d="M7.3 17h8.9" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" opacity=".35"/>',
  recipes: '<path d="M5 13.2h14l-1.2 4.8a3.1 3.1 0 0 1-3 2.4H9.2a3.1 3.1 0 0 1-3-2.4L5 13.2Z" fill="currentColor" opacity=".15"/><path d="M8.3 13c.4-2.1 1.8-3.4 3.7-3.4s3.3 1.3 3.7 3.4M9.8 8.2c-.8-1.4-.5-2.6.4-3.5M14.3 8.2c.8-1.2.7-2.5-.1-3.5" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><circle cx="12" cy="16.6" r="1.7" fill="currentColor" opacity=".34"/><path d="M8.4 18.5h7.2" stroke="currentColor" stroke-width="1.05" stroke-linecap="round" opacity=".35"/>',
  tv: '<rect x="4" y="7" width="16" height="11.2" rx="3.2" fill="currentColor" opacity=".15"/><rect x="7.2" y="10.1" width="9.6" height="4.6" rx="1.2" fill="currentColor" opacity=".22"/><path d="M9 4.7 12 7l3-2.3M9.5 20.5h5" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M18 9.6c.5.8.5 4.5 0 5.3" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity=".5"/>',
  ski: '<path d="M4 18.3 10 8l3.1 5 2.6-3.4 4.3 8.7H4Z" fill="currentColor" opacity=".14"/><path d="M8.5 9.6 11 6.7l2.8 3.2M7 20.1c3.9-1.2 6.2-1.2 10 0" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M16.2 9.3v5.8M14.3 11h3.8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".6"/>',
  'church-music': '<path d="M10 18.3A2.3 2.3 0 1 1 7.7 16H10V6.3l8-1.8v10.7" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 17.3A2.3 2.3 0 1 1 15.7 15H18M10 8.5l8-1.8" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/><path d="M5.5 8.6c1.4-1.1 2.8-1.1 4.2 0M15.3 4.3c1.5-.8 3-.8 4.3 0" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity=".42"/>',
  foraging: '<path d="M12 20c0-6.2 2.5-10.2 7.1-13-6 .7-10.8 4.7-12 10 1.9-.8 4.2-.4 4.9 3Z" fill="currentColor" opacity=".16"/><path d="M5.1 12.8c2.6-1.1 5.7-.9 8.1 1M12 20c-.9-3.8-3-6.6-6.8-8.7M16.2 9.4c1.2-1.4 2.6-2.5 4.2-3.2" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round"/><circle cx="7" cy="17" r="1.1" fill="currentColor" opacity=".28"/>',
  camping: '<path d="M4.5 18.7 12 5l7.5 13.7H4.5Z" fill="currentColor" opacity=".15"/><path d="M12 5v13.7M8.9 18.7l3.1-4.9 3.1 4.9M4.2 18.7h15.6" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 15.2c-1.3-.7-2.2-.7-3.4 0M17.5 15.2c1.3-.7 2.2-.7 3.4 0" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity=".4"/>',
  fishing: '<path d="M3.7 12s3.8-4.8 8.3-4.8 8.3 4.8 8.3 4.8-3.8 4.8-8.3 4.8S3.7 12 3.7 12Z" fill="currentColor" opacity=".15"/><path d="M17.2 12 21 8.6v6.8L17.2 12Z" fill="currentColor" opacity=".22"/><circle cx="9.3" cy="10.9" r=".8" fill="currentColor"/><path d="M6 18.9c2.4-1.2 5.6-1.2 8 0M13 8.2c1.3 1.5 1.3 6.1 0 7.6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity=".55"/>',
  genealogy: '<path d="M12 20V8M8.2 20h7.6" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round"/><path d="M12 8c-2.1-3-5.6-3.3-7.8-.7 3 .2 5.4 1 7.8.7ZM12 8c2.1-3 5.6-3.3 7.8-.7-3 .2-5.4 1-7.8.7ZM7.6 13.2c-1.7-1.7-4-1.7-5.6 0 1.9.2 3.8.8 5.6 0ZM16.4 13.2c1.7-1.7 4-1.7 5.6 0-1.9.2-3.8.8-5.6 0Z" fill="currentColor" opacity=".16"/><path d="M12 8c2.6 4.1 2.6 8.1 0 12" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" opacity=".45"/>',
};

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
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
  return mode === 'auto' ? `Auto · ${resolved === 'aurora' ? 'Aurora' : 'Field'}` : resolved === 'aurora' ? 'Aurora' : 'Field';
}

function applyTheme() {
  const resolvedTheme = resolveTheme();
  activeResolvedTheme = resolvedTheme;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themeMode = themeMode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'aurora' ? '#081116' : '#315f48');
}

function setThemeMode(nextMode) {
  if (!['auto', 'field', 'aurora'].includes(nextMode)) return;
  themeMode = nextMode;
  localStorage.setItem(THEME_STORAGE_KEY, nextMode);
  renderRoute(activeRoute).catch(showRenderError);
}

function getModuleAccent(appModule) {
  return activeResolvedTheme === 'aurora' ? appModule.accentDark : appModule.accentLight;
}

function renderModuleIcon(slug) {
  const icon = MODULE_ICONS[slug] || '<circle cx="12" cy="12" r="8"/><path d="M12 8v8M8 12h8"/>';
  return `<span class="module-icon" aria-hidden="true"><svg viewBox="0 0 24 24" role="img">${icon}</svg></span>`;
}

function renderThemeControl() {
  return `
    <div class="theme-control" role="group" aria-label="Theme mode">
      ${[['auto', getThemeLabel('auto')], ['field', 'Field'], ['aurora', 'Aurora']]
        .map(([mode, label]) => `<button class="theme-option${themeMode === mode ? ' theme-option-active' : ''}" type="button" data-theme-mode="${mode}">${escapeHtml(label)}</button>`)
        .join('')}
    </div>`;
}

function renderShell(content) {
  applyTheme();
  appRoot.innerHTML = `
    <div class="app-shell">
      <header class="suite-header">
        <a class="brand" href="${routeToHash('dashboard')}" aria-label="Lazy Acres Suite dashboard">
          <img class="brand-icon" src="${APP_ICON_URL}" alt="" aria-hidden="true" />
          <span><strong>Lazy Acres Suite</strong><small>Home base</small></span>
        </a>
        <label class="command-bar" aria-label="Search apps or Today">
          <span aria-hidden="true">⌕</span>
          <input type="search" placeholder="Search apps or Today…" disabled />
          <kbd>⌘ K</kbd>
        </label>
        <div class="header-actions">${renderThemeControl()}<span class="version-flag" aria-label="App version">${escapeHtml(APP_VERSION)}</span></div>
      </header>
      ${content}
    </div>`;
}

function renderCopyButton(appModule, className = 'button button-secondary') {
  return `<button class="${className}" type="button" data-copy-url="${escapeHtml(getLiveModuleUrl(appModule.slug))}">Copy link</button>`;
}

function renderLegacyLink(appModule, className) {
  return appModule.legacyUrl
    ? `<a class="${className}" href="${escapeHtml(appModule.legacyUrl)}" rel="noopener noreferrer">${escapeHtml(appModule.legacyLabel || 'Open')}</a>`
    : `<button class="${className}" type="button" disabled>${escapeHtml(appModule.legacyLabel || 'Open')}</button>`;
}

function renderAppCard(appModule) {
  const accent = getModuleAccent(appModule);
  return `
    <article class="module-card module-${escapeHtml(appModule.slug)}" style="--module-accent: ${escapeHtml(accent)};">
      <div class="module-card__body">${renderModuleIcon(appModule.slug)}<h3>${escapeHtml(appModule.shortTitle || appModule.title)}</h3><p>${escapeHtml(appModule.description)}</p></div>
      <div class="module-card__actions">${renderLegacyLink(appModule, 'button button-primary')}${renderCopyButton(appModule)}<a class="icon-action" href="${routeToHash(appModule.slug)}" aria-label="Details for ${escapeHtml(appModule.title)}">→</a></div>
    </article>`;
}

function renderTodayTiles(snapshot = dashboardSnapshot) {
  const sections = snapshot?.sections || [];
  return sections.map((section) => `
    <article class="today-tile today-tile-${escapeHtml(section.state)}">
      <div class="today-tile-heading">
        <h3>${escapeHtml(section.title)}</h3>
        ${section.state === 'connected' ? '<span>Live</span>' : ''}
      </div>
      <p>${escapeHtml(section.message)}</p>
      ${section.items?.length ? `<ul>${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
    </article>`).join('');
}

function renderHeroStats(snapshot = dashboardSnapshot) {
  const summary = snapshot?.summary || { connected: 0, unavailable: 4 };
  return `
    <span><strong>${escapeHtml(summary.connected)}</strong> connected</span>
    <span><strong>${escapeHtml(summary.unavailable)}</strong> waiting</span>
  `;
}

function renderHero({ expanded = false } = {}) {
  const unavailable = dashboardSnapshot?.summary?.unavailable ?? 4;
  const heroLine = unavailable > 0
    ? 'Today is ready for live data, but some sources are not connected yet.'
    : 'Today is pulling live information into one place.';

  return `
    <section class="hero ${activeResolvedTheme === 'aurora' ? 'hero-aurora' : 'hero-field'} ${expanded ? 'hero-expanded' : ''}">
      <div class="hero-intro">
        <p class="eyebrow">${activeResolvedTheme === 'aurora' ? 'Aurora Utility' : 'Field Lab'}</p>
        <h1>${expanded ? 'Today' : 'Good morning, Tod.'}</h1>
        <p>${escapeHtml(heroLine)}</p>
        <div class="hero-stats" aria-label="Today data status">${renderHeroStats()}</div>
      </div>
      <div class="today-surface" aria-label="Today overview">${renderTodayTiles()}</div>
    </section>`;
}

function renderDashboard() {
  return `
    <main class="dashboard">
      ${renderHero()}
      <section class="module-group" aria-label="Apps">
        <div class="module-group__header"><h2>Your Modules</h2><p>${getThemeLabel()} theme active</p></div>
        <div class="module-grid">${moduleRegistry.map(renderAppCard).join('')}</div>
      </section>
    </main>`;
}

function renderTodayPage() {
  return `<main class="today-page">${renderHero({ expanded: true })}</main>`;
}

function renderModule(appModule) {
  const accent = getModuleAccent(appModule);
  return `
    <main class="module-detail">
      <article class="placeholder-card" style="--module-accent: ${escapeHtml(accent)};">
        ${renderModuleIcon(appModule.slug)}<h1>${escapeHtml(appModule.title)}</h1><p>${escapeHtml(appModule.description)}</p>
        <div class="detail-actions">${renderLegacyLink(appModule, 'button button-primary')}${renderCopyButton(appModule)}<button class="button button-secondary" type="button" data-route="dashboard">Back to dashboard</button></div>
      </article>
    </main>`;
}

function renderNotFound(route) {
  return `<main class="module-detail"><article class="placeholder-card"><h1>No app found for /#/${escapeHtml(route)}</h1><p>Use the dashboard to choose one of the available apps.</p><div class="detail-actions"><button class="button button-primary" type="button" data-route="dashboard">Back to dashboard</button></div></article></main>`;
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) throw new Error('Copy command failed.');
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
  appRoot.querySelectorAll('[data-route]').forEach((button) => button.addEventListener('click', () => navigateTo(button.dataset.route)));
}

function bindThemeButtons() {
  appRoot.querySelectorAll('[data-theme-mode]').forEach((button) => button.addEventListener('click', () => setThemeMode(button.dataset.themeMode)));
}

function showRenderError(error) {
  console.error(error);
  appRoot.innerHTML = '<main class="no-script"><h1>App shell error</h1><p>Check the browser console for details.</p></main>';
}

async function renderRoute(route) {
  activeRoute = route;
  applyTheme();
  dashboardSnapshot = await getDashboardSnapshot();
  const user = await authService.getCurrentUser();
  await entitlementService.listVisibleModules(user, moduleRegistry);
  const appModule = getModuleBySlug(route);
  const content = route === 'dashboard' ? renderDashboard() : route === 'today' ? renderTodayPage() : appModule ? renderModule(appModule) : renderNotFound(route);
  renderShell(content);
  bindRouteButtons();
  bindThemeButtons();
  bindCopyButtons();
}

if (!appRoot) throw new Error('Missing app shell root element.');

applyTheme();
bindHashRouter((route) => renderRoute(route).catch(showRenderError));

window.setInterval(() => {
  if (themeMode !== 'auto') return;
  const nextTheme = resolveTheme('auto');
  if (nextTheme !== activeResolvedTheme) renderRoute(activeRoute).catch(showRenderError);
}, 60_000);
