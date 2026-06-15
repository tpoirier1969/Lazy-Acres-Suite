import { moduleRegistry } from './modules.js?v=0.1.18';

const APP_VERSION = 'v0.1.18-rescue';
const APP_ICON_URL = './assets/app-shell/mountain-suite-icon.svg?v=0.1.18';
const appRoot = document.querySelector('[data-app-shell-root]');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function getHourGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning.';
  if (hour < 17) return 'Good Afternoon.';
  return 'Good Evening.';
}

function renderModuleIcon(slug) {
  const fileName = {
    shopping: 'Shopping.png',
    scheduler: 'scheduler.png',
    recipes: 'recipes.png',
    foraging: 'foraging.png',
    camping: 'camping.png',
    fishing: 'fishing.png',
    tv: 'tv-tracker.png',
    ski: 'ski.png',
    genealogy: 'genealogy.png',
    'church-music': 'church-music.png',
  }[slug];
  return fileName
    ? `<span class="module-icon" aria-hidden="true"><img src="./assets/app-shell/icons/field-lab/${escapeHtml(fileName)}?v=0.1.18" alt="" loading="eager" decoding="async"></span>`
    : '<span class="module-icon module-icon-missing" aria-hidden="true"></span>';
}

function renderCard(appModule) {
  const url = appModule.legacyUrl || '#';
  const accent = appModule.accentLight || '#476b37';
  return `
    <article class="module-card module-${escapeHtml(appModule.slug)}" style="--module-accent:${escapeHtml(accent)};">
      <div class="module-card__body">${renderModuleIcon(appModule.slug)}<h3>${escapeHtml(appModule.shortTitle || appModule.title)}</h3><p>${escapeHtml(appModule.description)}</p></div>
      <div class="module-card__actions"><a class="button button-primary" href="${escapeHtml(url)}" rel="noopener noreferrer">${escapeHtml(appModule.legacyLabel || 'Open')}</a></div>
    </article>`;
}

function render() {
  if (!appRoot) throw new Error('Missing app root.');
  document.documentElement.dataset.theme = 'field';
  appRoot.innerHTML = `
    <div class="app-shell">
      <header class="suite-header">
        <a class="brand" href="./" aria-label="Lazy Acres Suite dashboard">
          <img class="brand-icon" src="${APP_ICON_URL}" alt="" aria-hidden="true" />
          <span><strong>Lazy Acres Suite</strong><small>Rescue shell</small></span>
        </a>
        <div class="command-bar" aria-label="Rescue status"><span aria-hidden="true">⌕</span><input type="search" placeholder="Live Today paused while shell recovers…" disabled /><kbd>Safe</kbd></div>
        <div class="header-actions"><span class="version-flag" aria-label="App version">${APP_VERSION}</span></div>
      </header>
      <main class="dashboard">
        <section class="hero hero-field">
          <div class="hero-art" aria-hidden="true"></div>
          <div class="hero-intro"><p class="eyebrow">Emergency Shell</p><h1>${escapeHtml(getHourGreeting())}</h1><p>The live Today panel is temporarily bypassed so the dashboard can load. Open modules from the cards below.</p><div class="hero-stats"><span><strong>${moduleRegistry.length}</strong> modules</span><span><strong>0</strong> live sources loaded</span></div></div>
          <div class="today-surface" aria-label="Recovery status"><article class="today-tile today-tile-connected"><div class="today-tile-heading"><h3>Status</h3><span>Safe</span></div><p>Dashboard rescue shell is active.</p></article></div>
        </section>
        <section class="module-group" aria-label="Apps"><div class="module-group__header"><h2>Your Modules</h2><p>Live dashboard data is paused until the broken startup path is repaired.</p></div><div class="module-grid">${moduleRegistry.map(renderCard).join('')}</div></section>
      </main>
    </div>`;
}

try {
  render();
} catch (error) {
  console.error(error);
  if (appRoot) appRoot.innerHTML = '<main class="no-script"><h1>Lazy Acres Suite rescue failed</h1><p>Check the browser console for the first JavaScript error.</p></main>';
}
