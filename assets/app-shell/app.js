import { authService } from './auth.js';
import { billingService } from './billing.js';
import { entitlementService } from './entitlements.js';
import { getModuleBySlug, getModulesByGroup, moduleGroups, moduleRegistry } from './modules.js';
import { bindHashRouter, navigateTo, routeToHash } from './router.js';

const appRoot = document.querySelector('[data-app-shell-root]');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderShell(content, { route, user, billingStatus }) {
  appRoot.innerHTML = `
    <div class="app-shell">
      <header class="suite-header">
        <a class="brand" href="${routeToHash('dashboard')}" aria-label="Lazy Acres Suite dashboard">
          <span class="brand-mark" aria-hidden="true">LA</span>
          <span>
            <strong>Lazy Acres Suite</strong>
            <small>Modular app framework</small>
          </span>
        </a>
        <div class="header-meta">
          <span class="pill">Route: /#/${escapeHtml(route)}</span>
          <span class="pill">Testing mode</span>
        </div>
      </header>

      <section class="testing-banner" aria-label="Testing mode notice">
        <div>
          <strong>Tod and Donna testing access</strong>
          <p>All modules are visible and open without login while auth, billing, and entitlements are stubs.</p>
        </div>
        <dl>
          <div><dt>User</dt><dd>${escapeHtml(user.displayName)}</dd></div>
          <div><dt>Auth</dt><dd>No login required</dd></div>
          <div><dt>Billing</dt><dd>${billingStatus.enabled ? 'Enabled' : 'Not implemented'}</dd></div>
        </dl>
      </section>

      ${content}
    </div>
  `;
}

function renderDashboardModules(group) {
  const modules = getModulesByGroup(group.id);
  const cards = modules
    .map(
      (appModule) => `
        <article class="module-card">
          <div class="module-card__body">
            <p class="eyebrow">${escapeHtml(appModule.status)}</p>
            <h3>${escapeHtml(appModule.title)}</h3>
            <p>${escapeHtml(appModule.description)}</p>
          </div>
          <div class="module-card__actions">
            <a class="button button-primary" href="${routeToHash(appModule.slug)}">Open module</a>
            ${renderLegacyLink(appModule, 'button button-secondary')}
          </div>
        </article>
      `,
    )
    .join('');

  return `
    <section class="module-group" aria-labelledby="group-${escapeHtml(group.id)}">
      <div class="module-group__header">
        <h2 id="group-${escapeHtml(group.id)}">${escapeHtml(group.title)}</h2>
        <p>${escapeHtml(group.description)}</p>
      </div>
      <div class="module-grid">${cards}</div>
    </section>
  `;
}

function renderDashboard() {
  const groups = moduleGroups.map((group) => renderDashboardModules(group)).join('');

  return `
    <main class="dashboard">
      <section class="hero">
        <p class="eyebrow">Dashboard landing page</p>
        <h1>Choose a Lazy Acres module</h1>
        <p>
          This is the clean framework shell only. Existing app logic has not been migrated, and legacy apps stay outside this repo until intentionally brought in later.
        </p>
      </section>
      ${groups}
    </main>
  `;
}

function renderLegacyLink(appModule, className) {
  if (!appModule.legacyUrl) {
    return `<button class="${className}" type="button" disabled title="Add this module's legacyUrl in assets/app-shell/modules.js when the old app link is ready.">${escapeHtml(appModule.legacyLabel)}</button>`;
  }

  return `<a class="${className}" href="${escapeHtml(appModule.legacyUrl)}" rel="noopener noreferrer">${escapeHtml(appModule.legacyLabel)}</a>`;
}

async function renderModule(appModule, user) {
  const access = await entitlementService.getModuleAccess(user, appModule);

  return `
    <main class="module-detail">
      <article class="placeholder-card">
        <p class="eyebrow">Direct module route</p>
        <h1>${escapeHtml(appModule.title)}</h1>
        <p>${escapeHtml(appModule.description)}</p>

        <dl class="detail-list">
          <div><dt>Status</dt><dd>${escapeHtml(appModule.status)}</dd></div>
          <div><dt>Route</dt><dd>/#/${escapeHtml(appModule.slug)}</dd></div>
          <div><dt>Category</dt><dd>${escapeHtml(appModule.group)}</dd></div>
          <div><dt>Access</dt><dd>${access.canOpen ? 'Open in testing mode' : 'Unavailable'}</dd></div>
        </dl>

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
        <p class="eyebrow">Route not found</p>
        <h1>No module exists for /#/${escapeHtml(route)}</h1>
        <p>Use the dashboard to choose one of the registered modules.</p>
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
  const billingStatus = await billingService.getBillingStatus();
  await entitlementService.listVisibleModules(user, moduleRegistry);
  const appModule = getModuleBySlug(route);

  let content;
  if (route === 'dashboard') {
    content = renderDashboard();
  } else if (appModule) {
    content = await renderModule(appModule, user);
  } else {
    content = renderNotFound(route);
  }

  renderShell(content, { route, user, billingStatus });
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
