import { authService } from './auth.js?v=0.1.7';
import { entitlementService } from './entitlements.js?v=0.1.7';
import { getDashboardSnapshot } from './dashboard-data.js?v=0.1.7';
import { getModuleBySlug, moduleRegistry } from './modules.js?v=0.1.7';
import { bindHashRouter, navigateTo, routeToHash } from './router.js?v=0.1.7';

const APP_VERSION = 'v0.1.7';
const LIVE_BASE_URL = 'https://tpoirier1969.github.io/Lazy-Acres-Suite/';
const APP_ICON_URL = './assets/app-shell/lazy-acres-suite-icon.svg?v=0.1.7';
const THEME_STORAGE_KEY = 'lazy-acres-suite-theme-mode';
const appRoot = document.querySelector('[data-app-shell-root]');

let activeRoute = 'dashboard';
let themeMode = getStoredThemeMode();
let activeResolvedTheme = null;
let dashboardSnapshot = null;

const MODULE_ICONS = {
  shopping: `
    <ellipse cx="60" cy="92" rx="32" ry="7" fill="currentColor" opacity=".13"/>
    <path d="M29 43c3-5 11-8 22-8h18c11 0 19 3 22 8l-7 37c-2 9-9 14-18 14H54c-9 0-16-5-18-14L29 43Z" fill="currentColor" opacity=".2"/>
    <path d="M37 45h46l-6 35c-1.3 6.6-6 10-13 10h-8c-7 0-11.7-3.4-13-10l-6-35Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" opacity=".75"/>
    <path d="M44 45c3-16 9-24 16-24s13 8 16 24" fill="none" stroke="currentColor" stroke-width="4.4" stroke-linecap="round"/>
    <path d="M80 58c11-5 20-1 23 7-10 3-18 1-23-7ZM40 61c-11-2-19 3-21 12 10 1 17-3 21-12Z" fill="currentColor" opacity=".36"/>
    <path d="M45 61h30M48 71h24M51 81h18" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".45"/>`,
  scheduler: `
    <ellipse cx="60" cy="92" rx="30" ry="7" fill="currentColor" opacity=".12"/>
    <rect x="29" y="28" width="62" height="62" rx="13" fill="currentColor" opacity=".18"/>
    <path d="M37 28h46c6 0 10 4 10 10v41c0 7-4 11-11 11H38c-7 0-11-4-11-11V38c0-6 4-10 10-10Z" fill="none" stroke="currentColor" stroke-width="4" opacity=".72"/>
    <path d="M44 18v20M76 18v20M29 46h62" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/>
    <rect x="41" y="56" width="12" height="12" rx="3" fill="currentColor" opacity=".58"/>
    <rect x="58" y="56" width="12" height="12" rx="3" fill="currentColor" opacity=".35"/>
    <rect x="75" y="56" width="12" height="12" rx="3" fill="currentColor" opacity=".22"/>
    <rect x="41" y="73" width="12" height="12" rx="3" fill="currentColor" opacity=".28"/>
    <path d="M57 81h28" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".35"/>`,
  recipes: `
    <ellipse cx="60" cy="92" rx="34" ry="7" fill="currentColor" opacity=".13"/>
    <path d="M28 61h64l-6 21c-2.7 9-10 14-21 14H55c-11 0-18-5-21-14l-6-21Z" fill="currentColor" opacity=".2"/>
    <path d="M30 61h60l-5 20c-2 8-8 12-18 12H53c-10 0-16-4-18-12l-5-20Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" opacity=".75"/>
    <path d="M42 60c3-12 10-19 20-19 9 0 16 7 18 19" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round"/>
    <path d="M51 38c-7-10-5-21 4-28M69 38c8-9 8-19 1-28" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity=".7"/>
    <circle cx="60" cy="75" r="7" fill="currentColor" opacity=".35"/>
    <path d="M38 87c13 5 31 5 44 0" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".3"/>`,
  tv: `
    <ellipse cx="60" cy="93" rx="32" ry="7" fill="currentColor" opacity=".13"/>
    <rect x="25" y="39" width="70" height="45" rx="13" fill="currentColor" opacity=".2"/>
    <path d="M33 39h54c7 0 11 4 11 11v24c0 7-4 11-11 11H33c-7 0-11-4-11-11V50c0-7 4-11 11-11Z" fill="none" stroke="currentColor" stroke-width="4" opacity=".72"/>
    <rect x="38" y="52" width="38" height="20" rx="5" fill="currentColor" opacity=".23"/>
    <path d="M47 27 60 39l13-12M47 95h26" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round"/>
    <circle cx="85" cy="55" r="3" fill="currentColor" opacity=".6"/>
    <circle cx="85" cy="68" r="3" fill="currentColor" opacity=".36"/>
    <path d="M41 77c10 3 28 3 38 0" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" opacity=".3"/>`,
  ski: `
    <ellipse cx="60" cy="94" rx="35" ry="7" fill="currentColor" opacity=".12"/>
    <path d="M18 83 45 36l15 24 12-17 30 40H18Z" fill="currentColor" opacity=".17"/>
    <path d="M18 83 45 36l15 24 12-17 30 40H18Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" opacity=".72"/>
    <path d="M37 48 49 27l16 27M70 47l9-14 9 14" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M78 39v30M68 49h22" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" opacity=".75"/>
    <rect x="72" y="66" width="13" height="12" rx="4" fill="currentColor" opacity=".33"/>
    <path d="M29 93c18-6 44-6 62 0" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity=".45"/>`,
  'church-music': `
    <ellipse cx="60" cy="94" rx="32" ry="7" fill="currentColor" opacity=".12"/>
    <path d="M48 30c0 22-7 34-16 46 8 15 48 15 56 0-9-12-16-24-16-46" fill="currentColor" opacity=".17"/>
    <path d="M48 30v46c0 11-7 18-17 18M72 30v46c0 11 7 18 17 18M48 30h24" fill="none" stroke="currentColor" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M40 76h40M44 64h32M48 52h24" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" opacity=".46"/>
    <path d="M40 28c5-7 12-10 20-10s15 3 20 10" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity=".85"/>
    <path d="M31 78c4 5 13 8 29 8s25-3 29-8" fill="none" stroke="currentColor" stroke-width="3" opacity=".45"/>`,
  foraging: `
    <ellipse cx="60" cy="94" rx="34" ry="7" fill="currentColor" opacity=".12"/>
    <path d="M58 91c1-29 14-52 41-69-34 3-61 25-69 57 11-6 24-4 28 12Z" fill="currentColor" opacity=".22"/>
    <path d="M58 91c1-29 14-52 41-69-34 3-61 25-69 57 11-6 24-4 28 12Z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round" opacity=".7"/>
    <path d="M33 63c17-7 36-5 52 7M58 91C52 69 39 51 18 42M75 42c7-8 15-14 25-18" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"/>
    <path d="M31 42c-13-14-10-28 6-33 7 15 4 27-6 33ZM78 66c17-9 31-4 36 9-16 4-28 1-36-9Z" fill="currentColor" opacity=".2"/>
    <circle cx="36" cy="80" r="6" fill="currentColor" opacity=".24"/>`,
  camping: `
    <ellipse cx="60" cy="94" rx="36" ry="7" fill="currentColor" opacity=".12"/>
    <path d="M19 87 60 20l41 67H19Z" fill="currentColor" opacity=".18"/>
    <path d="M19 87 60 20l41 67H19Z" fill="none" stroke="currentColor" stroke-width="4.3" stroke-linejoin="round" opacity=".75"/>
    <path d="M60 20v67M43 87l17-27 17 27" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M18 87h84" stroke="currentColor" stroke-width="4" stroke-linecap="round" opacity=".48"/>
    <path d="M24 71c-10-5-17-4-24 2M96 71c10-5 17-4 24 2M86 38c7 6 11 14 12 24M34 41c-8 5-12 12-13 21" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".32"/>`,
  fishing: `
    <ellipse cx="60" cy="94" rx="36" ry="7" fill="currentColor" opacity=".13"/>
    <path d="M18 58s19-24 43-24 43 24 43 24-19 24-43 24-43-24-43-24Z" fill="currentColor" opacity=".19"/>
    <path d="M18 58s19-24 43-24 43 24 43 24-19 24-43 24-43-24-43-24Z" fill="none" stroke="currentColor" stroke-width="4" opacity=".72"/>
    <path d="M90 58 111 40v36L90 58Z" fill="currentColor" opacity=".25" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/>
    <circle cx="47" cy="52" r="4" fill="currentColor"/>
    <path d="M61 36c7 8 7 36 0 44M25 89c14-6 31-6 48 0" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" opacity=".52"/>
    <path d="M35 69c14 5 34 5 49 0" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".3"/>`,
  genealogy: `
    <ellipse cx="60" cy="94" rx="35" ry="7" fill="currentColor" opacity=".12"/>
    <path d="M60 92V31" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
    <path d="M60 31c-13-19-35-21-49-5 18 2 34 7 49 5ZM60 31c13-19 35-21 49-5-18 2-34 7-49 5Z" fill="currentColor" opacity=".22" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M38 58c-12-12-29-12-40 0 14 2 28 6 40 0ZM82 58c12-12 29-12 40 0-14 2-28 6-40 0Z" fill="currentColor" opacity=".18" stroke="currentColor" stroke-width="3"/>
    <path d="M35 92h50M60 31c10 23 10 43 0 61M60 56c-11 10-18 19-22 31M60 56c11 10 18 19 22 31" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" opacity=".48"/>`,
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
  const icon = MODULE_ICONS[slug] || '<circle cx="60" cy="60" r="32" fill="currentColor" opacity=".2"/><path d="M60 42v36M42 60h36" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>';
  return `<span class="module-icon" aria-hidden="true"><svg viewBox="0 0 120 120" role="img">${icon}</svg></span>`;
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
  return `
    <span><strong>${escapeHtml(summary.connected)}</strong> live sources</span>
    <span><strong>${escapeHtml(summary.unavailable)}</strong> waiting</span>
  `;
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
