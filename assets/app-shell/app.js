import { authService } from './auth.js?v=0.1.18';
import { entitlementService } from './entitlements.js?v=0.1.18';
import { getDashboardSnapshot } from './dashboard-data-live-timer.js?v=0.1.49';
import { FIELD_LAB_HERO_IMAGE } from './hero-image.js?v=0.1.18';
import { getModuleBySlug, moduleRegistry } from './modules.js?v=0.1.52';
import { bindHashRouter, navigateTo, routeToHash } from './router.js?v=0.1.18';

const APP_VERSION = 'v0.1.54';
const LIVE_BASE_URL = 'https://tpoirier1969.github.io/Lazy-Acres-Suite/';
const APP_ICON_URL = './assets/app-shell/mountain-suite-icon.svg?v=0.1.18';
const THEME_STORAGE_KEY = 'lazy-acres-suite-theme-mode';
const USER_PROFILE_STORAGE_KEY = 'lazy-acres-suite-user-profile';
const MODULE_ORDER_STORAGE_KEY = 'lazy-acres-suite-module-order';
const appRoot = document.querySelector('[data-app-shell-root]');

const USER_PROFILE_LABELS = {
  tod: 'Tod',
  donna: 'Donna',
  guest: 'Guest',
};

const USER_PROFILE_NAMES = {
  tod: 'Tod',
  donna: 'Donna',
  guest: '',
};

const MODULE_ICON_URLS = {
  shopping: './assets/app-shell/icons/field-lab/Shopping.png?v=0.1.18',
  scheduler: './assets/app-shell/icons/field-lab/scheduler.png?v=0.1.18',
  recipes: './assets/app-shell/icons/field-lab/recipes.png?v=0.1.18',
  foraging: './assets/app-shell/icons/field-lab/foraging.png?v=0.1.18',
  camping: './assets/app-shell/icons/field-lab/camping.png?v=0.1.18',
  fishing: './assets/app-shell/icons/field-lab/fishing.png?v=0.1.18',
  tv: './assets/app-shell/icons/field-lab/tv-tracker.png?v=0.1.18',
  ski: './assets/app-shell/icons/field-lab/ski.png?v=0.1.18',
  genealogy: './assets/app-shell/icons/field-lab/genealogy.png?v=0.1.18',
  'church-music': './assets/app-shell/icons/field-lab/church-music.png?v=0.1.18',
  'boat-estimator': './assets/app-shell/icons/field-lab/boat-estimator.svg?v=0.1.54',
};

let activeRoute = 'dashboard';
let themeMode = getStoredThemeMode();
let activeUserProfile = getStoredUserProfile();
let activeModuleOrder = getStoredModuleOrder();
let moduleReorderMode = false;
let activeResolvedTheme = null;
let dashboardSnapshot = getFallbackDashboardSnapshot();
let dashboardSnapshotRequestId = 0;

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function getFallbackDashboardSnapshot() {
  return {
    status: 'loading',
    generatedAt: new Date().toISOString(),
    sections: [],
    summary: { connected: 0, unavailable: 4, total: 4 },
    missingConfig: [],
  };
}

function getLiveModuleUrl(slug) {
  return `${LIVE_BASE_URL}#/${slug}`;
}

function getStoredThemeMode() {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return ['auto', 'field', 'aurora'].includes(stored) ? stored : 'auto';
}

function getStoredUserProfile() {
  const stored = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
  return Object.prototype.hasOwnProperty.call(USER_PROFILE_LABELS, stored) ? stored : '';
}

function getStoredModuleOrder() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MODULE_ORDER_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeModuleOrder(order = activeModuleOrder) {
  const allSlugs = moduleRegistry.map((appModule) => appModule.slug);
  const seen = new Set();
  const stored = (Array.isArray(order) ? order : []).filter((slug) => {
    if (!allSlugs.includes(slug) || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
  return [...stored, ...allSlugs.filter((slug) => !seen.has(slug))];
}

function saveModuleOrder(order) {
  activeModuleOrder = normalizeModuleOrder(order);
  localStorage.setItem(MODULE_ORDER_STORAGE_KEY, JSON.stringify(activeModuleOrder));
}

function getOrderedModules() {
  return normalizeModuleOrder().map((slug) => getModuleBySlug(slug)).filter(Boolean);
}

function moveModule(slug, direction) {
  const order = normalizeModuleOrder();
  const index = order.indexOf(slug);
  if (index < 0) return;
  const nextIndex = direction === 'up' ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= order.length) return;
  [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
  saveModuleOrder(order);
  renderRoute(activeRoute).catch(showRenderError);
}

function moveModuleBefore(slug, beforeSlug) {
  if (!slug || !beforeSlug || slug === beforeSlug) return;
  const order = normalizeModuleOrder().filter((item) => item !== slug);
  const targetIndex = order.indexOf(beforeSlug);
  if (targetIndex < 0) return;
  order.splice(targetIndex, 0, slug);
  saveModuleOrder(order);
  renderRoute(activeRoute).catch(showRenderError);
}

function setModuleReorderMode(nextMode) {
  moduleReorderMode = Boolean(nextMode);
  renderRoute(activeRoute).catch(showRenderError);
}

function getAutoTheme() {
  const hour = new Date().getHours();
  return hour >= 19 || hour < 7 ? 'aurora' : 'field';
}

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function renderGreeting({ expanded = false } = {}) {
  if (expanded) return 'Today';
  const name = USER_PROFILE_NAMES[activeUserProfile] || '';
  return `${getTimeGreeting()}${name ? `, ${name}` : ''}.`;
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
  document.documentElement.style.setProperty('--field-lab-hero-image', `url("${FIELD_LAB_HERO_IMAGE}")`);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolvedTheme === 'aurora' ? '#081116' : '#315f48');
}

function setThemeMode(nextMode) {
  if (!['auto', 'field', 'aurora'].includes(nextMode)) return;
  themeMode = nextMode;
  localStorage.setItem(THEME_STORAGE_KEY, nextMode);
  renderRoute(activeRoute).catch(showRenderError);
}

function setUserProfile(nextProfile) {
  if (!Object.prototype.hasOwnProperty.call(USER_PROFILE_LABELS, nextProfile)) return;
  activeUserProfile = nextProfile;
  localStorage.setItem(USER_PROFILE_STORAGE_KEY, nextProfile);
  renderRoute(activeRoute).catch(showRenderError);
}

function requestUserProfile() {
  activeUserProfile = '';
  localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
  renderRoute(activeRoute).catch(showRenderError);
}

function getModuleAccent(appModule) {
  return activeResolvedTheme === 'aurora' ? appModule.accentDark : appModule.accentLight;
}

function getModuleLaunchUrl(slug) {
  const appModule = getModuleBySlug(slug);
  return appModule?.legacyUrl || routeToHash(slug);
}

function getExternalLinkAttrs(url) {
  return /^https?:\/\//i.test(url) ? ' target="_blank" rel="noopener noreferrer"' : '';
}

function renderModuleIcon(slug) {
  const src = MODULE_ICON_URLS[slug];
  return src
    ? `<span class="module-icon" aria-hidden="true"><img src="${escapeHtml(src)}" alt="" loading="eager" decoding="async"></span>`
    : '<span class="module-icon module-icon-missing" aria-hidden="true"></span>';
}

function renderThemeControl() {
  const buttons = [['auto', getThemeLabel('auto')], ['field', 'Field'], ['aurora', 'Aurora']]
    .map(([mode, label]) => `<button class="theme-option${themeMode === mode ? ' theme-option-active' : ''}" type="button" data-theme-mode="${escapeHtml(mode)}">${escapeHtml(label)}</button>`)
    .join('');
  return `<div class="theme-control" role="group" aria-label="Theme mode">${buttons}</div>`;
}

function renderProfileControl() {
  const label = activeUserProfile ? USER_PROFILE_LABELS[activeUserProfile] : 'Choose user';
  return `<button class="profile-change" type="button" data-profile-change aria-label="Change user profile">${escapeHtml(label)}</button>`;
}

function renderLayoutControl() {
  return `<button class="layout-change${moduleReorderMode ? ' layout-change-active' : ''}" type="button" data-layout-toggle>${moduleReorderMode ? 'Done' : 'Arrange'}</button>`;
}

function renderAppLaunchOptions() {
  return getOrderedModules()
    .map((appModule) => `<option value="open:${escapeHtml(appModule.slug)}">Open ${escapeHtml(appModule.shortTitle || appModule.title)}</option>`)
    .join('');
}

function renderMobilePreferences() {
  const profileLabel = activeUserProfile ? USER_PROFILE_LABELS[activeUserProfile] : 'Choose user';
  return `
    <select class="mobile-preferences" data-mobile-preferences aria-label="Theme, user, layout, and app shortcuts">
      <option value="">${escapeHtml(getThemeLabel())} · ${escapeHtml(profileLabel)}</option>
      <optgroup label="Open app">
        ${renderAppLaunchOptions()}
      </optgroup>
      <optgroup label="Theme">
        <option value="theme:auto">Auto theme</option>
        <option value="theme:field">Field theme</option>
        <option value="theme:aurora">Aurora theme</option>
      </optgroup>
      <optgroup label="User">
        <option value="profile:tod">Tod</option>
        <option value="profile:donna">Donna</option>
        <option value="profile:guest">Guest</option>
      </optgroup>
      <optgroup label="Layout">
        <option value="layout:toggle">${moduleReorderMode ? 'Finish arranging modules' : 'Arrange modules'}</option>
      </optgroup>
    </select>`;
}

function renderProfilePrompt() {
  if (activeUserProfile) return '';
  return `
    <div class="profile-prompt-overlay" role="dialog" aria-modal="true" aria-labelledby="profile-prompt-title">
      <section class="profile-prompt-card">
        <p class="eyebrow">Local Profile</p>
        <h2 id="profile-prompt-title">Who is using Lazy Acres Suite?</h2>
        <p>This is only saved on this browser. Pick Guest to keep the greeting neutral.</p>
        <div class="profile-options">
          <button class="profile-option" type="button" data-profile-choice="tod">Tod</button>
          <button class="profile-option" type="button" data-profile-choice="donna">Donna</button>
          <button class="profile-option profile-option-secondary" type="button" data-profile-choice="guest">Guest</button>
        </div>
      </section>
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
        <div class="header-actions">${renderThemeControl()}${renderProfileControl()}${renderLayoutControl()}${renderMobilePreferences()}<span class="version-flag" aria-label="App version">${escapeHtml(APP_VERSION)}</span></div>
      </header>
      ${content}
    </div>
    ${renderProfilePrompt()}`;
}

function renderLegacyLink(appModule, className) {
  return appModule.legacyUrl
    ? `<a class="${className}" href="${escapeHtml(appModule.legacyUrl)}"${getExternalLinkAttrs(appModule.legacyUrl)}>${escapeHtml(appModule.legacyLabel || 'Open')}</a>`
    : `<button class="${className}" type="button" disabled>${escapeHtml(appModule.legacyLabel || 'Open')}</button>`;
}

function renderReorderActions(appModule, index, total) {
  if (!moduleReorderMode) return '';
  return `<div class="module-reorder-actions" aria-label="Move ${escapeHtml(appModule.title)}">
    <button class="module-move-button" type="button" data-module-move="up" data-module-slug="${escapeHtml(appModule.slug)}"${index === 0 ? ' disabled' : ''}>↑ Up</button>
    <button class="module-move-button" type="button" data-module-move="down" data-module-slug="${escapeHtml(appModule.slug)}"${index === total - 1 ? ' disabled' : ''}>Down ↓</button>
  </div>`;
}

function renderAppCard(appModule, index = 0, modules = moduleRegistry) {
  const accent = getModuleAccent(appModule);
  const reorderClass = moduleReorderMode ? ' module-card-reorder' : '';
  return `
    <article class="module-card module-${escapeHtml(appModule.slug)}${reorderClass}" style="--module-accent: ${escapeHtml(accent)};" data-module-card data-module-slug="${escapeHtml(appModule.slug)}" draggable="${moduleReorderMode ? 'true' : 'false'}">
      <div class="module-card__top">${renderModuleIcon(appModule.slug)}<h3>${escapeHtml(appModule.shortTitle || appModule.title)}</h3>${renderLegacyLink(appModule, 'button button-primary button-compact module-open-button')}</div>
      ${renderReorderActions(appModule, index, modules.length)}
    </article>`;
}

function getTodaySectionSlug(sectionId) {
  if (sectionId === 'scheduler') return 'scheduler';
  if (sectionId === 'shopping') return 'shopping';
  if (sectionId === 'tv') return 'tv';
  return '';
}

function inferRecentItemRoute(item) {
  const text = String(item || '').toLowerCase();
  if (/shopping|grocery|list|store|walmart|super one|menards/.test(text)) return 'shopping';
  if (/calendar|event|meeting|lesson|schedule|appointment|rehearsal|performance/.test(text)) return 'scheduler';
  if (/recipe|meal|cook|bread|pantry/.test(text)) return 'recipes';
  if (/tv|episode|series|watch/.test(text)) return 'tv';
  if (/ski|trail|run|snow/.test(text)) return 'ski';
  if (/forag|mushroom|berry|plant|find/.test(text)) return 'foraging';
  if (/camp|trip|site|route|boondock/.test(text)) return 'camping';
  if (/fish|catch|trout|salmon|lake/.test(text)) return 'fishing';
  if (/boat|aluminum|hull|motor|trailer|estimate/.test(text)) return 'boat-estimator';
  if (/genealogy|family|record|ancestor/.test(text)) return 'genealogy';
  if (/church|music|song|canticle|hymn|choir/.test(text)) return 'church-music';
  return '';
}

function renderTodayItem(section, item) {
  const text = typeof item === 'string' ? item : String(item?.text || item?.title || item?.label || '');
  if (!text) return '';
  const slug = section.id === 'recent' ? inferRecentItemRoute(text) : '';
  if (!slug) return `<li>${escapeHtml(text)}</li>`;
  const url = getModuleLaunchUrl(slug);
  return `<li><a class="today-item-link" href="${escapeHtml(url)}"${getExternalLinkAttrs(url)}>${escapeHtml(text)}</a></li>`;
}

function renderTodayTileContent(section) {
  return `
    <div class="today-tile-heading"><h3>${escapeHtml(section.title)}</h3>${section.state === 'connected' ? '<span>Live</span>' : '<span class="quiet-state">Pending</span>'}</div>
    <p>${escapeHtml(section.message)}</p>
    ${section.items?.length ? `<ul>${section.items.map((item) => renderTodayItem(section, item)).join('')}</ul>` : ''}`;
}

function renderTodayTiles(snapshot = dashboardSnapshot) {
  const sections = snapshot?.sections || [];
  return sections.map((section) => {
    const slug = getTodaySectionSlug(section.id);
    const classes = `today-tile today-tile-${escapeHtml(section.state)} today-tile-${escapeHtml(section.id)}${slug ? ' today-tile-clickable' : ''}`;
    const content = renderTodayTileContent(section);
    if (!slug) return `<article class="${classes}">${content}</article>`;
    const url = getModuleLaunchUrl(slug);
    return `<a class="${classes}" href="${escapeHtml(url)}"${getExternalLinkAttrs(url)} aria-label="Open ${escapeHtml(section.title)}">${content}</a>`;
  }).join('');
}

function renderHeroStats(snapshot = dashboardSnapshot) {
  const summary = snapshot?.summary || { connected: 0, unavailable: 4 };
  return `<span><strong>${escapeHtml(summary.connected)}</strong> live sources</span><span><strong>${escapeHtml(summary.unavailable)}</strong> waiting</span>`;
}

function renderHero({ expanded = false } = {}) {
  return `
    <section class="hero ${activeResolvedTheme === 'aurora' ? 'hero-aurora' : 'hero-field'} ${expanded ? 'hero-expanded' : ''}">
      <div class="hero-art" aria-hidden="true"></div>
      <div class="hero-intro"><p class="eyebrow">${activeResolvedTheme === 'aurora' ? 'Aurora Utility' : 'Field Lab'}</p><h1>${escapeHtml(renderGreeting({ expanded }))}</h1><div class="hero-stats" aria-label="Today data status">${renderHeroStats()}</div></div>
      <div class="today-surface" aria-label="Today overview">${renderTodayTiles()}</div>
    </section>`;
}

function renderDashboard() {
  const orderedModules = getOrderedModules();
  return `<main class="dashboard">${renderHero()}<section class="module-group" aria-label="Apps"><div class="module-group__header"><h2>Your Modules</h2><p>${moduleReorderMode ? 'Drag modules or use the move buttons.' : `${getThemeLabel()} theme active`}</p></div><div class="module-grid">${orderedModules.map((appModule, index) => renderAppCard(appModule, index, orderedModules)).join('')}</div></section></main>`;
}

function renderTodayPage() {
  return `<main class="today-page">${renderHero({ expanded: true })}</main>`;
}

function renderModule(appModule) {
  const accent = getModuleAccent(appModule);
  return `<main class="module-detail"><article class="placeholder-card" style="--module-accent: ${escapeHtml(accent)};">${renderModuleIcon(appModule.slug)}<h1>${escapeHtml(appModule.title)}</h1><p>${escapeHtml(appModule.description)}</p><div class="detail-actions">${renderLegacyLink(appModule, 'button button-primary')}<button class="button button-secondary" type="button" data-route="dashboard">Back to dashboard</button></div></article></main>`;
}

function renderNotFound(route) {
  return `<main class="module-detail"><article class="placeholder-card"><h1>No app found for /#/${escapeHtml(route)}</h1><p>Use the dashboard to choose one of the available apps.</p><div class="detail-actions"><button class="button button-primary" type="button" data-route="dashboard">Back to dashboard</button></div></article></main>`;
}

function bindRouteButtons() {
  appRoot.querySelectorAll('[data-route]').forEach((button) => button.addEventListener('click', () => navigateTo(button.dataset.route)));
}

function bindThemeButtons() {
  appRoot.querySelectorAll('[data-theme-mode]').forEach((button) => button.addEventListener('click', () => setThemeMode(button.dataset.themeMode)));
}

function bindProfileButtons() {
  appRoot.querySelectorAll('[data-profile-choice]').forEach((button) => button.addEventListener('click', () => setUserProfile(button.dataset.profileChoice)));
  appRoot.querySelector('[data-profile-change]')?.addEventListener('click', requestUserProfile);
}

function bindLayoutButtons() {
  appRoot.querySelector('[data-layout-toggle]')?.addEventListener('click', () => setModuleReorderMode(!moduleReorderMode));
  appRoot.querySelectorAll('[data-module-move]').forEach((button) => {
    button.addEventListener('click', () => moveModule(button.dataset.moduleSlug, button.dataset.moduleMove));
  });
  appRoot.querySelectorAll('[data-module-card]').forEach((card) => {
    if (!moduleReorderMode) return;
    card.addEventListener('dragstart', (event) => {
      event.dataTransfer?.setData('text/plain', card.dataset.moduleSlug || '');
      event.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    });
    card.addEventListener('drop', (event) => {
      event.preventDefault();
      moveModuleBefore(event.dataTransfer?.getData('text/plain'), card.dataset.moduleSlug);
    });
  });
}

function openAppInNewPage(slug) {
  const url = getModuleLaunchUrl(slug);
  if (!url) return;
  const opened = window.open(url, '_blank', 'noopener,noreferrer');
  if (!opened) window.location.href = url;
}

function bindPreferenceSelects() {
  appRoot.querySelectorAll('[data-mobile-preferences]').forEach((select) => {
    select.addEventListener('change', () => {
      const [kind, value] = String(select.value || '').split(':');
      select.value = '';
      if (kind === 'theme') setThemeMode(value);
      if (kind === 'profile') setUserProfile(value);
      if (kind === 'layout') setModuleReorderMode(!moduleReorderMode);
      if (kind === 'open') openAppInNewPage(value);
    });
  });
}

function bindShellControls() {
  bindRouteButtons();
  bindThemeButtons();
  bindProfileButtons();
  bindLayoutButtons();
  bindPreferenceSelects();
}

function showRenderError(error) {
  console.error(error);
  appRoot.innerHTML = '<main class="no-script"><h1>App shell error</h1><p>Check the browser console for details.</p></main>';
}

function renderRouteContent(route) {
  const appModule = getModuleBySlug(route);
  const content = route === 'dashboard' ? renderDashboard() : route === 'today' ? renderTodayPage() : appModule ? renderModule(appModule) : renderNotFound(route);
  renderShell(content);
  bindShellControls();
}

async function refreshLiveDashboard(route, requestId) {
  try {
    const nextSnapshot = await getDashboardSnapshot();
    if (requestId !== dashboardSnapshotRequestId || route !== activeRoute) return;
    dashboardSnapshot = nextSnapshot;
    renderRouteContent(route);
  } catch (error) {
    console.warn('Dashboard live data refresh failed.', error);
  }
}

async function renderRoute(route) {
  activeRoute = route;
  applyTheme();
  const user = await authService.getCurrentUser();
  await entitlementService.listVisibleModules(user, moduleRegistry);
  renderRouteContent(route);
  const requestId = ++dashboardSnapshotRequestId;
  refreshLiveDashboard(route, requestId);
}

if (!appRoot) throw new Error('Missing app shell root element.');

applyTheme();
bindHashRouter((route) => renderRoute(route).catch(showRenderError));
window.setInterval(() => {
  if (themeMode !== 'auto') return;
  const nextTheme = resolveTheme('auto');
  if (nextTheme !== activeResolvedTheme) renderRoute(activeRoute).catch(showRenderError);
}, 60_000);
