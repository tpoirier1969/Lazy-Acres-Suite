import { authService } from './auth.js?v=0.1.1';
import { entitlementService } from './entitlements.js?v=0.1.1';
import { getModuleBySlug, moduleRegistry } from './modules.js?v=0.1.1';
import { bindHashRouter, navigateTo, routeToHash } from './router.js?v=0.1.1';

const APP_VERSION = 'v0.1.1';
const appRoot = document.querySelector('[data-app-shell-root]');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderShell(content) {
  appRoot.innerHTML = `
    <div class="app-shell">
      <header class="suite-header">
        <a class="brand" href="${routeToHash('dashboard')}" aria-label="Lazy Acres Suite dashboard">
          <span class="brand-mark" aria-hidden="true">LA</span>
          <span>
            <strong>Lazy Acres Suite</strong>
            <small>Home base</small>
          </span>
        </a>
        <span class="version-flag" aria-label="App version">${escapeHtml(APP_VERSION)}</span>
      </header>

      ${content}
    </div>
  `;
}

function renderAppCard(appModule) {
  return `
    <article class="module-card">
      <div class="module-card__body">
        <h3>${escapeHtml(appModule.title)}</h3>
        <p>${escapeHtml(appModule.description)}</p>
      </div>
      <div class="module-card__actions">
        ${renderLegacyLink(appModule, 'button button-primary')}
        <a class="button button-secondary" href="${routeToHash(appModule.slug)}">Details</a>
      </div>
    </article>
  `;
}

function renderDashboard() {
  const cards = moduleRegistry.map(renderAppCard).join('');

  return `
    <main class="dashboard">
      <section class="hero">
        <h1>Lazy Acres Suite</h1>
        <p>One home base for the apps we use, test, and eventually grow.</p>
      </section>
      <section class="module-group" aria-label="Apps">
        <div class="module-grid">${cards}</div>
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
  return `
    <main class="module-detail">
      <article class="placeholder-card">
        <h1>${escapeHtml(appModule.title)}</h1>
        <p>${escapeHtml(appModule.description)}</p>

        <div class="detail-actions">
          ${renderLegacyLink(appModule, 'button button-primary')}
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

function bindRouteButtons() {
  appRoot.querySelectorAll('[data-route]').forEach((button) => {
    button.addEventListener('click', () => navigateTo(button.dataset.route));
  });
}

async function renderRoute(route) {
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
}

if (!appRoot) {
  throw new Error('Missing app shell root element.');
}

bindHashRouter((route) => {
  renderRoute(route).catch((error) => {
    console.error(error);
    appRoot.innerHTML = '<main class="no-script"><h1>App shell error</h1><p>Check the browser console for details.</p></main>';
  });
});
