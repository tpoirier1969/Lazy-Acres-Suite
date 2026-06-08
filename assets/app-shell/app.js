import { authService } from './auth.js?v=0.1.5';
import { entitlementService } from './entitlements.js?v=0.1.5';
import { getModuleBySlug, moduleRegistry } from './modules.js?v=0.1.5';
import { bindHashRouter, navigateTo, routeToHash } from './router.js?v=0.1.5';

const APP_VERSION = 'v0.1.5';
const LIVE_BASE_URL = 'https://tpoirier1969.github.io/Lazy-Acres-Suite/';
const APP_ICON_URL = './assets/app-shell/lazy-acres-suite-icon.svg?v=0.1.5';
const THEME_STORAGE_KEY = 'lazy-acres-suite-theme-mode';
const appRoot = document.querySelector('[data-app-shell-root]');

let activeRoute = 'dashboard';
let themeMode = getStoredThemeMode();
let activeResolvedTheme = null;

const MODULE_ICONS = {
  shopping: '<rect x="4" y="7" width="16" height="13" rx="4" fill="currentColor" opacity=".13"/><path d="M7 10h10l-1 5.5a2 2 0 0 1-2 1.6h-4a2 2 0 0 1-2-1.6L7 10Z" fill="currentColor" opacity=".18" stroke="currentColor" stroke-width="1.2"/><path d="M9 10a3 3 0 0 1 6 0" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M17 11.4c1.7-.7 2.8-.1 3.4 1-1.6.5-2.8.2-3.4-1ZM7 11.5c-1.8-.3-2.8.5-3.1 1.7 1.6.2 2.7-.3 3.1-1.7Z" fill="currentColor" opacity=".32"/>',
  scheduler: '<rect x="4" y="5" width="16" height="15" rx="3.5" fill="currentColor" opacity=".13" stroke="currentColor" stroke-width="1.2"/><path d="M8 3.7v3.4M16 3.7v3.4M4 9.5h16" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="7" y="12" width="3" height="3" rx="1" fill="currentColor" opacity=".42"/><rect x="11" y="12" width="3" height="3" rx="1" fill="currentColor" opacity=".26"/><rect x="15" y="12" width="3" height="3" rx="1" fill="currentColor" opacity=".18"/>',
  recipes: '<path d="M5 13h14l-1.1 4.7a2.8 2.8 0 0 1-2.8 2.3H8.9a2.8 2.8 0 0 1-2.8-2.3L5 13Z" fill="currentColor" opacity=".14" stroke="currentColor" stroke-width="1.2"/><path d="M8.4 13c.4-2.2 1.8-3.5 3.6-3.5s3.2 1.3 3.6 3.5M9.6 8.4c-.7-1.3-.5-2.6.4-3.5M14.4 8.4c.8-1.2.8-2.5 0-3.6" fill="none" stroke="currentColor" stroke-width="1.35"/><circle cx="12" cy="16" r="1.6" fill="currentColor" opacity=".32"/>',
  tv: '<rect x="4" y="7" width="16" height="11" rx="3" fill="currentColor" opacity=".13" stroke="currentColor" stroke-width="1.2"/><rect x="7.2" y="10.2" width="9.6" height="4.6" rx="1.2" fill="currentColor" opacity=".2"/><path d="M9 4.5 12 7l3-2.5M9.5 20.5h5" fill="none" stroke="currentColor" stroke-width="1.4"/>',
  ski: '<path d="M4 18 10 8l3.2 5 2.4-3.2L20 18H4Z" fill="currentColor" opacity=".13" stroke="currentColor" stroke-width="1.2"/><path d="M8.6 9.5 11 6.8 13.7 9.8M7.4 20c3.7-1.1 5.8-1.1 9.2 0M16.2 9.3v5.7M14.3 10.9h3.8" fill="none" stroke="currentColor" stroke-width="1.3"/>',
  'church-music': '<path d="M10 18.3A2.3 2.3 0 1 1 7.7 16H10V6.2l8-1.7v10.7" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M18 17.3A2.3 2.3 0 1 1 15.7 15H18M10 8.5 18 6.8" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="18" cy="7" r="1" fill="currentColor" opacity=".35"/>',
  foraging: '<path d="M12 20c0-6.1 2.5-10.1 7.1-13-6 .7-10.8 4.7-12 10 1.9-.8 4.2-.4 4.9 3Z" fill="currentColor" opacity=".14" stroke="currentColor" stroke-width="1.2"/><path d="M5.2 12.8c2.5-1.1 5.6-.9 8 1M12 20c-.9-3.8-3-6.6-6.8-8.7M16.2 9.4c1.2-1.4 2.6-2.5 4.2-3.2" fill="none" stroke="currentColor" stroke-width="1.3"/>',
  camping: '<path d="M4.5 18.7 12 5l7.5 13.7H4.5Z" fill="currentColor" opacity=".13" stroke="currentColor" stroke-width="1.2"/><path d="M12 5v13.7M8.9 18.7l3.1-4.9 3.1 4.9M4.2 18.7h15.6" fill="none" stroke="currentColor" stroke-width="1.35"/>',
  fishing: '<path d="M3.7 12s3.8-4.8 8.3-4.8 8.3 4.8 8.3 4.8-3.8 4.8-8.3 4.8S3.7 12 3.7 12Z" fill="currentColor" opacity=".13" stroke="currentColor" stroke-width="1.2"/><path d="M17.3 12 21 8.5v7L17.3 12Z" fill="currentColor" opacity=".2"/><circle cx="9.3" cy="10.8" r=".8" fill="currentColor"/><path d="M6 18.9c2.4-1.2 5.6-1.2 8 0" fill="none" stroke="currentColor" stroke-width="1.3"/>',
  genealogy: '<path d="M12 20V8M8.2 20h7.6" fill="none" stroke="currentColor" stroke-width="1.35"/><path d="M12 8c-2.1-3-5.6-3.3-7.8-.7 3 .2 5.4 1 7.8.7ZM12 8c2.1-3 5.6-3.3 7.8-.7-3 .2-5.4 1-7.8.7ZM7.6 13.2c-1.7-1.7-4-1.7-5.6 0 1.9.2 3.8.8 5.6 0ZM16.4 13.2c1.7-1.7 4-1.7 5.6 0-1.9.2-3.8.8-5.6 0Z" fill="currentColor" opacity=".15" stroke="currentColor" stroke-width="1.1"/>',
};

const TODAY_ITEMS = [
  ['Calendar', '<strong>10:30</strong> Donna voice lesson<br><strong>1:00</strong> WNMU traffic review<br><strong>6:30</strong> Stake vendor fire'],
  ['Weather', '<strong class="weather-temp">52°</strong><span>Fog & Calm</span><small>Clearing expected by midday. Good day for trail work and campfire prep.</small>'],
  ['Recent', '<strong>8:12</strong> Logged Rainbow Trout<br><strong>New</strong> 2 TV episodes ready<br><strong>Today</strong> Dutch Oven Bread added'],
  ['Shopping', '<strong>Need</strong> Eggs, coffee filters, bananas, RV paper towels'],
];

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

function renderPageTabs() {
  return `
    <div class="page-tabs" role="navigation" aria-label="Primary view">
      <button class="page-tab${activeRoute === 'dashboard' ? ' page-tab-active' : ''}" type="button" data-route="dashboard">Home</button>
      <button class="page-tab${activeRoute === 'today' ? ' page-tab-active' : ''}" type="button" data-route="today">Today</button>
    </div>`;
}

function renderTodayTiles() {
  return TODAY_ITEMS.map(([title, body]) => `
    <article class="today-tile">
      <h3>${escapeHtml(title)}</h3>
      <p>${body}</p>
    </article>`).join('');
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
        <label class="command-bar" aria-label="Search or type a command">
          <span aria-hidden="true">⌕</span>
          <input type="search" placeholder="Search or type a command…" disabled />
          <kbd>⌘ K</kbd>
        </label>
        <div class="header-actions">${renderThemeControl()}<span class="version-flag" aria-label="App version">${escapeHtml(APP_VERSION)}</span></div>
      </header>
      ${renderPageTabs()}
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
      <div class="module-card__footer"><span>${escapeHtml(appModule.metric || '')}</span><a class="icon-action" href="${routeToHash(appModule.slug)}" aria-label="Details for ${escapeHtml(appModule.title)}">→</a></div>
      <div class="module-card__actions">${renderLegacyLink(appModule, 'button button-primary')}${renderCopyButton(appModule)}</div>
    </article>`;
}

function renderHero({ expanded = false } = {}) {
  return `
    <section class="hero ${activeResolvedTheme === 'aurora' ? 'hero-aurora' : 'hero-field'} ${expanded ? 'hero-expanded' : ''}">
      <div class="hero-copy">
        <p class="eyebrow">${activeResolvedTheme === 'aurora' ? 'Aurora Utility' : 'Field Lab'}</p>
        <h1>${expanded ? 'Today & Active' : 'Good morning, Tod.'}</h1>
        <p>${expanded ? 'Calendar, weather, recent activity, and shopping list in one place.' : 'One home base for the apps we use, test, and eventually grow.'}</p>
        <div class="hero-stats" aria-label="Today at a glance"><span><strong>3</strong> active items</span><span><strong>2</strong> events today</span><span><strong>7</strong> tasks due</span></div>
      </div>
      <div class="today-surface" aria-label="Today overview">${renderTodayTiles()}<button class="button button-primary membrane-large" type="button" data-route="today">Open Today</button></div>
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
