const TIMER_STORE_PREFIX = 'lazy-acres-timer-v1';
const SUITE_PROFILE_STORAGE_KEY = 'lazy-acres-suite-user-profile';
const TIMER_PROFILES = ['tod', 'donna', 'guest'];
const TIMER_APP_JS_URL = 'https://tpoirier1969.github.io/LazyAcresTimer/assets/app.js';
const TIMER_ICON_URL = './assets/app-shell/icons/field-lab/timer.png?v=0.1.52';

let timerVersionPromise = null;
let refreshScheduled = false;

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll(String.fromCharCode(34), '&quot;')
    .replaceAll(String.fromCharCode(39), '&#039;');
}

function getPreferredProfiles() {
  const stored = localStorage.getItem(SUITE_PROFILE_STORAGE_KEY);
  return stored && TIMER_PROFILES.includes(stored)
    ? [stored, ...TIMER_PROFILES.filter((profile) => profile !== stored)]
    : TIMER_PROFILES;
}

function readTimerData(profile) {
  try {
    const raw = localStorage.getItem(`${TIMER_STORE_PREFIX}:${profile}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.warn(`Could not read Timer data for ${profile}.`, error);
    return null;
  }
}

function cleanStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function getRunningProjectIds(data) {
  const ids = new Set();
  (Array.isArray(data?.sessions) ? data.sessions : []).forEach((session) => {
    if (!session || session.deleted || session.ended || !session.projectId) return;
    ids.add(session.projectId);
  });
  return ids;
}

function isOpenTimerProject(project, runningProjectIds) {
  if (!project || project.deleted || project.archived) return false;
  if (runningProjectIds.has(project.id)) return true;
  const closedStatuses = new Set(['closed', 'complete', 'completed', 'done', 'inactive', 'archived']);
  if (closedStatuses.has(cleanStatus(project.status || 'active'))) return false;
  return project.landing === true;
}

function getProjectSortDate(project) {
  const date = new Date(project?.lastWorked || project?.updated || project?.created || '');
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function profileLabel(profile) {
  if (profile === 'tod') return 'Tod';
  if (profile === 'donna') return 'Donna';
  return 'Guest';
}

function readTimerProjects() {
  const projects = [];
  getPreferredProfiles().forEach((profile) => {
    const data = readTimerData(profile);
    if (!data) return;
    const runningProjectIds = getRunningProjectIds(data);
    (Array.isArray(data.projects) ? data.projects : [])
      .filter((project) => isOpenTimerProject(project, runningProjectIds))
      .forEach((project) => {
        projects.push({
          id: project.id,
          profile,
          name: project.name || 'Untitled project',
          typeName: project.typeName || '',
          running: runningProjectIds.has(project.id),
          sort: getProjectSortDate(project),
        });
      });
  });

  const seen = new Set();
  return projects
    .sort((a, b) => b.sort - a.sort)
    .filter((project) => {
      const key = `${project.profile}:${project.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getTimerVersion() {
  if (!timerVersionPromise) {
    timerVersionPromise = fetch(`${TIMER_APP_JS_URL}?version-probe=${Date.now()}`, { cache: 'no-store' })
      .then((response) => response.ok ? response.text() : '')
      .then((text) => text.match(/const\s+APP_VERSION\s*=\s*'([^']+)'/)?.[1] || '')
      .catch((error) => {
        console.warn('Could not read Timer version.', error);
        return '';
      });
  }
  return timerVersionPromise;
}

function ensureStyles() {
  if (document.querySelector('[data-timer-card-project-styles]')) return;
  const style = document.createElement('style');
  style.dataset.timerCardProjectStyles = 'true';
  style.textContent = `
    .module-card .timer-card-projects {
      margin: 0.75rem 0 0;
      padding: 0.7rem 0.75rem;
      border-radius: 1rem;
      background: rgba(227, 218, 193, 0.42);
      color: var(--text-muted, #5f6759);
      font-size: 0.84rem;
      line-height: 1.35;
    }
    .timer-card-projects strong {
      display: block;
      color: var(--text-strong, #142015);
      font-size: 0.78rem;
      margin-bottom: 0.35rem;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .timer-card-projects ul {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.25rem;
    }
    .timer-card-projects li {
      display: flex;
      gap: 0.35rem;
      align-items: baseline;
      min-width: 0;
    }
    .timer-card-projects .timer-dot {
      color: var(--module-accent, #476b37);
      flex: 0 0 auto;
    }
    .timer-card-projects .timer-project-name {
      color: var(--text-strong, #142015);
      font-weight: 700;
    }
    .timer-card-projects .timer-project-meta {
      color: var(--text-muted, #697164);
      font-size: 0.78rem;
    }
    .timer-card-projects .timer-more {
      color: var(--text-muted, #697164);
      font-size: 0.78rem;
    }
    .timer-card-version {
      display: inline-flex;
      width: fit-content;
      margin-top: 0.5rem;
      padding: 0.22rem 0.5rem;
      border-radius: 999px;
      background: rgba(227, 218, 193, 0.6);
      color: var(--text-muted, #5f6759);
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.03em;
    }
  `;
  document.head.appendChild(style);
}

function renderProjectList(projects) {
  if (!projects.length) return '';
  const visible = projects.slice(0, 3);
  const more = projects.length - visible.length;
  return `<div class='timer-card-projects' data-timer-card-projects><strong>Current projects</strong><ul>${visible.map((project) => {
    const meta = [project.running ? 'Running' : '', project.typeName || '', project.profile !== 'tod' ? profileLabel(project.profile) : ''].filter(Boolean).join(' · ');
    return `<li><span class='timer-dot'>•</span><span><span class='timer-project-name'>${escapeHtml(project.name)}</span>${meta ? ` <span class='timer-project-meta'>${escapeHtml(meta)}</span>` : ''}</span></li>`;
  }).join('')}${more > 0 ? `<li class='timer-more'>+${more} more</li>` : ''}</ul></div>`;
}

function updateTimerIcon(timerCard) {
  const body = timerCard.querySelector('.module-card__body');
  if (!body) return;
  let icon = body.querySelector('.module-icon');
  if (!icon) {
    icon = document.createElement('span');
    icon.className = 'module-icon';
    icon.setAttribute('aria-hidden', 'true');
    body.prepend(icon);
  }
  let image = icon.querySelector('img');
  if (!image) {
    image = document.createElement('img');
    image.alt = '';
    image.loading = 'eager';
    image.decoding = 'async';
    icon.replaceChildren(image);
  }
  const expected = new URL(TIMER_ICON_URL, document.baseURI).href;
  if (image.src !== expected) image.src = TIMER_ICON_URL;
  image.dataset.timerIcon = 'true';
}

function setOrRemoveHtml(container, selector, html) {
  const existing = container.querySelector(selector);
  if (!html) {
    existing?.remove();
    return;
  }
  if (existing?.__timerRenderedHtml === html) return;
  existing?.remove();
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const next = template.content.firstElementChild;
  if (!next) return;
  next.__timerRenderedHtml = html;
  container.appendChild(next);
}

function decorateTimerCard(version = '') {
  ensureStyles();
  const timerCard = document.querySelector('[data-module-card][data-module-slug="timer"]');
  if (!timerCard) return;
  const body = timerCard.querySelector('.module-card__body');
  if (!body) return;

  updateTimerIcon(timerCard);

  const projects = readTimerProjects();
  const versionHtml = version ? `<span class='timer-card-version' data-timer-card-version>${escapeHtml(version)}</span>` : '';
  setOrRemoveHtml(body, '[data-timer-card-version]', versionHtml);
  setOrRemoveHtml(body, '[data-timer-card-projects]', renderProjectList(projects));
}

async function refreshTimerCard() {
  const version = await getTimerVersion();
  decorateTimerCard(version);
}

function scheduleRefresh() {
  if (refreshScheduled) return;
  refreshScheduled = true;
  window.setTimeout(() => {
    refreshScheduled = false;
    refreshTimerCard();
  }, 80);
}

scheduleRefresh();
window.addEventListener('hashchange', scheduleRefresh);
window.addEventListener('storage', scheduleRefresh);

const observer = new MutationObserver(scheduleRefresh);
observer.observe(document.querySelector('[data-app-shell-root]') || document.body, { childList: true, subtree: true });