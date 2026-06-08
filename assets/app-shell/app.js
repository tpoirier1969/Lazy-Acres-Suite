import { authService } from './auth.js?v=0.1.8';
import { entitlementService } from './entitlements.js?v=0.1.8';
import { getDashboardSnapshot } from './dashboard-data.js?v=0.1.8';
import { getModuleBySlug, moduleRegistry } from './modules.js?v=0.1.8';
import { bindHashRouter, navigateTo, routeToHash } from './router.js?v=0.1.8';

const APP_VERSION = 'v0.1.8';
const LIVE_BASE_URL = 'https://tpoirier1969.github.io/Lazy-Acres-Suite/';
const APP_ICON_URL = './assets/app-shell/lazy-acres-suite-icon.svg?v=0.1.8';
const THEME_STORAGE_KEY = 'lazy-acres-suite-theme-mode';
const appRoot = document.querySelector('[data-app-shell-root]');

const MODULE_ICON_FILES = {
  shopping: 'shopping.svg',
  scheduler: 'scheduler.svg',
  recipes: 'recipes.svg',
  foraging: 'foraging.svg',
  camping: 'camping.svg',
  fishing: 'fishing.svg',
  tv: 'tv-tracker.svg',
  ski: 'ski.svg',
  genealogy: 'genealogy.svg',
  'church-music': 'church-music.svg',
};

let activeRoute = 'dashboard';
let themeMode = getStoredThemeMode();
let activeResolvedTheme = null;
let dashboardSnapshot = null;

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
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

function getLiveModuleUrl(slug) {
  return `${LIVE_BASE_URL}#/${slug}`;
}

function renderModuleIcon(slug) {
  const iconFile = MODULE_ICON_FILES[slug] || 'shopping.svg';
  return `<span class="module-icon" aria-hidden="true"><img src="./assets/app-shell/icons/${iconFile}?v=0.1.8" alt="" /></span>`;
}

function renderThemeControl() {
  const buttons = [['auto', getThemeLabel('auto')], ['field', 'Field'], ['aurora', 'Aurora']]
    .map(([mode, label]) => `<button class="theme-option${themeMode === mode ? ' theme-option-active' : ''}" type="button" data-theme-mode="${mode}">${escapeHtml(label)}</button>`)
    .join('');
  return `<div class="theme-control" role="group" aria-label="Theme mode">${buttons}</div>`;
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
      <div class="module-card__body">
        ${renderModuleIcon(appModule.slug)}
        <h3>${escapeHtml(appModule.shortTitle || appModule.title)}</h3>
        <p>${escapeHtml(appModule.description)}</p>
      </div>
      <div class="module-card__actions">
        ${renderLegacyLink(appModule, 'button button-primary')}
        ${renderCopyButton(appModule)}
        <a class="icon-action" href="${routeToHash(appModule.slug)}" aria-label="Details for ${escapeHtml(appModule.title)}">→</a>
      </div>
    </article>`;
}

function renderTodayTiles(snapshot = dashboardSnapshot) {
  const sections = snapshot?.sections || [];
  return sections.map((section) => `
    <article class="today-tile today-tile-${escapeHtml(section.state)} today-tile-${escapeHtml(section.id)}">
      <div class="today-tile-heading">
        <h3>${escapeHtml(section.title)}</h3>
        ${section.state === 'connected' ? '<span>Live</span>' : '<span class="quiet-state">Pending</span>'}
      </div>
      <p>${escapeHtml(section.message)}</p>
      ${section.items?.length ? `<ul>${section.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
    </article>`).join('');
}

function renderHeroStats(snapshot = dashboardSnapshot) {
  const summary = snapshot?.summary || { connected: 0, unavailable: 4 };
  return `<span><strong>${escapeHtml(summary.connected)}</strong> live sources</span><span><strong>${escapeHtml(summary.unavailable)}</strong> waiting</span>`;
}

function renderHero({ expanded = false } = {}) {
  const unavailable = dashboardSnapshot?.summary?.unavailable ?? 4;
  const heroLine = unavailable > 0
    ? 'Today pulls in what is safely connected and keeps the rest quiet until ready.'
    : 'Today is pulling live calendar, weather, activity, and shopping into one place.';

  return `
    <section class="hero ${activeResolvedTheme === 'aurora' ? 'hero-aurora' : 'hero-field'} ${expanded ? 'hero-expanded' : ''}">
      <div class="hero-art" aria-hidden="true"></div>
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
        ${renderModuleIcon(appModule.slug)}
        <h1>${escapeHtml(appModule.title)}</h1>
        <p>${escapeHtml(appModule.description)}</p>
        <div class="detail-actions">
          ${renderLegacyLink(appModule, 'button button-primary')}
          ${renderCopyButton(appModule)}
          <button class="button button-secondary" type="button" data-route="dashboard">Back to dashboard</button>
        </div>
      </article>
    </main>`;
}

function renderNotFound(route) {
  return `<main class="module-detail"><article class="placeholder-card"><h1>No app found for /#/${escapeHtml(route)}</h1><p>Use the dashboard to choose one of the available apps.</p><div class="detail-actions"><button class="button button-primary" type="button" data-route="dashboard">Back to dashboard</button></div></article></main>`;
}

async function copyTextToClipboard(text) {
  if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable.');
  return navigator.clipboard.writeText(text);
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
