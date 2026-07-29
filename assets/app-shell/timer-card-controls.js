const TIMER_STORE_PREFIX = 'lazy-acres-timer-v1';
const SUITE_PROFILE_STORAGE_KEY = 'lazy-acres-suite-user-profile';
const TIMER_PROFILES = ['tod', 'donna', 'guest'];
const CAP_SECONDS = 36000;

let renderQueued = false;

function html(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function makeId() {
  return globalThis.crypto?.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function storageKey(profile) {
  return `${TIMER_STORE_PREFIX}:${profile}`;
}

function preferredProfiles() {
  const stored = localStorage.getItem(SUITE_PROFILE_STORAGE_KEY);
  return stored && TIMER_PROFILES.includes(stored)
    ? [stored, ...TIMER_PROFILES.filter((profile) => profile !== stored)]
    : TIMER_PROFILES;
}

function readTimerData(profile) {
  try {
    const raw = localStorage.getItem(storageKey(profile));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.warn(`Timer card could not read ${profile} data.`, error);
    return null;
  }
}

function writeTimerData(profile, data) {
  localStorage.setItem(storageKey(profile), JSON.stringify(data));
  window.dispatchEvent(new Event('storage'));
}

function elapsedSeconds(session, at = Date.now()) {
  const start = new Date(session?.started || 0).getTime();
  const end = session?.ended ? new Date(session.ended).getTime() : at;
  if (!start || Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.max(0, Math.floor((end - start) / 1000));
}

function countedSeconds(session, project, data) {
  const raw = elapsedSeconds(session);
  const cap = Number(data?.settings?.capSeconds || CAP_SECONDS);
  return project?.useCap ? Math.min(raw, cap) : raw;
}

function durationShort(seconds) {
  seconds = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

function durationLong(seconds) {
  seconds = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  if (m) return `${m}m`;
  return `${seconds % 60}s`;
}

function profileLabel(profile) {
  if (profile === 'tod') return 'Tod';
  if (profile === 'donna') return 'Donna';
  return 'Guest';
}

function cleanStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function projectTotalSeconds(data, project) {
  return (Array.isArray(data?.sessions) ? data.sessions : [])
    .filter((session) => session && !session.deleted && session.projectId === project.id)
    .reduce((total, session) => total + countedSeconds(session, project, data), 0);
}

function activeTimerProjects() {
  const projects = [];
  preferredProfiles().forEach((profile) => {
    const data = readTimerData(profile);
    if (!data) return;
    const sessions = Array.isArray(data.sessions) ? data.sessions : [];
    const runningByProject = new Map();
    sessions.forEach((session) => {
      if (session && !session.deleted && !session.ended && session.projectId && !runningByProject.has(session.projectId)) {
        runningByProject.set(session.projectId, session);
      }
    });
    (Array.isArray(data.projects) ? data.projects : []).forEach((project) => {
      if (!project || project.deleted || project.archived) return;
      const runningSession = runningByProject.get(project.id) || null;
      const closed = ['closed', 'complete', 'completed', 'done', 'inactive', 'archived'].includes(cleanStatus(project.status || 'active'));
      if (!runningSession && (closed || project.landing !== true)) return;
      projects.push({
        id: project.id,
        profile,
        name: project.name || 'Untitled project',
        typeName: project.typeName || '',
        running: Boolean(runningSession),
        runningSeconds: runningSession ? elapsedSeconds(runningSession) : 0,
        totalSeconds: projectTotalSeconds(data, project),
        sort: new Date(project.lastWorked || project.updated || project.created || 0).getTime() || 0,
      });
    });
  });
  return projects.sort((a, b) => Number(b.running) - Number(a.running) || b.sort - a.sort).slice(0, 4);
}

function markDirty(data, message) {
  data.sync = { count: 0, dirty: false, message: 'Local mode', last: null, ...(data.sync || {}) };
  data.sync.dirty = true;
  data.sync.count = (data.sync.count || 0) + 1;
  data.sync.message = message;
}

function startProject(profile, projectId) {
  const data = readTimerData(profile);
  if (!data) return;
  data.sessions ||= [];
  const project = (data.projects || []).find((candidate) => candidate && !candidate.deleted && candidate.id === projectId);
  if (!project) return;
  const stamp = nowIso();
  data.sessions.push({
    id: makeId(),
    projectId,
    started: stamp,
    ended: null,
    note: '',
    billed: false,
    billedAt: null,
    paid: false,
    paidAt: null,
    capSeconds: project.useCap ? data.settings?.capSeconds || CAP_SECONDS : null,
    manual: false,
    offline: true,
    created: stamp,
    updated: stamp,
    deleted: null,
  });
  project.lastWorked = stamp;
  project.updated = stamp;
  markDirty(data, `Started ${project.name || 'timer'}`);
  writeTimerData(profile, data);
}

function stopProject(profile, projectId) {
  const data = readTimerData(profile);
  if (!data) return;
  const project = (data.projects || []).find((candidate) => candidate && !candidate.deleted && candidate.id === projectId);
  const session = (data.sessions || []).find((candidate) => candidate && !candidate.deleted && !candidate.ended && candidate.projectId === projectId);
  if (!session) return;
  const stamp = nowIso();
  session.ended = stamp;
  session.rawSeconds = elapsedSeconds(session);
  session.countedSeconds = countedSeconds(session, project, data);
  session.capApplied = session.countedSeconds < session.rawSeconds;
  session.updated = stamp;
  if (project) {
    project.lastWorked = stamp;
    project.updated = stamp;
  }
  markDirty(data, `Stopped ${project?.name || 'timer'}`);
  writeTimerData(profile, data);
}

function toggleProject(profile, projectId, isRunning) {
  if (isRunning) stopProject(profile, projectId);
  else startProject(profile, projectId);
  queueRender(50);
}

function findTimerCard() {
  return document.querySelector('[data-module-card][data-module-slug="timer"]')
    || [...document.querySelectorAll('[data-module-card]')].find((card) => card.textContent?.includes('Lazy Acres Timer') || card.textContent?.includes('Timer'));
}

function ensureStyles() {
  if (document.querySelector('[data-timer-card-controls-style]')) return;
  const style = document.createElement('style');
  style.dataset.timerCardControlsStyle = 'true';
  style.textContent = `
    [data-module-slug='timer'] [data-timer-card-projects] { display: none !important; }
    .timer-card-quick { margin-top: .75rem; padding: .7rem .75rem; border-radius: 1rem; background: rgba(227, 218, 193, .42); display: grid; gap: .45rem; }
    .timer-card-quick strong { display: block; font-size: .78rem; letter-spacing: .02em; text-transform: uppercase; }
    .timer-card-quick-row { display: grid; grid-template-columns: 1fr auto; gap: .5rem; align-items: center; }
    .timer-card-quick-name { font-weight: 800; }
    .timer-card-quick-meta { color: var(--text-muted, #697164); font-size: .78rem; }
    .timer-card-quick-button { border: 0; border-radius: 999px; min-height: 31px; padding: .35rem .65rem; cursor: pointer; font-weight: 900; color: var(--ink, #182519); background: rgba(255, 251, 243, .75); box-shadow: inset 5px 5px 10px rgb(255 255 255 / .32), inset -5px -5px 10px rgb(131 113 81 / .1); }
    .timer-card-quick-button.is-running { color: white; background: #9b2f2f; box-shadow: none; }
  `;
  document.head.appendChild(style);
}

function renderControls() {
  ensureStyles();
  const card = findTimerCard();
  if (!card) return;
  const body = card.querySelector('.module-card__body') || card;
  const projects = activeTimerProjects();
  body.querySelector('[data-timer-card-quick]')?.remove();
  if (!projects.length) return;
  const rows = projects.map((project) => {
    const time = project.running ? durationShort(project.runningSeconds) : durationLong(project.totalSeconds);
    const meta = [project.running ? `Running ${time}` : `Total ${time}`, project.typeName, project.profile !== 'tod' ? profileLabel(project.profile) : ''].filter(Boolean).join(' · ');
    return `<div class='timer-card-quick-row'><div><div class='timer-card-quick-name'>${html(project.name)}</div><div class='timer-card-quick-meta'>${html(meta)}</div></div><button class='timer-card-quick-button${project.running ? ' is-running' : ''}' type='button' data-timer-quick-toggle data-profile='${html(project.profile)}' data-project='${html(project.id)}' data-running='${project.running ? '1' : '0'}'>${project.running ? 'Stop' : 'Start'}</button></div>`;
  }).join('');
  body.insertAdjacentHTML('beforeend', `<div class='timer-card-quick' data-timer-card-quick><strong>Timer shortcuts</strong>${rows}</div>`);
  body.querySelectorAll('[data-timer-quick-toggle]').forEach((button) => {
    button.addEventListener('click', () => toggleProject(button.dataset.profile, button.dataset.project, button.dataset.running === '1'));
  });
}

function queueRender(delay = 90) {
  if (renderQueued) return;
  renderQueued = true;
  window.setTimeout(() => {
    renderQueued = false;
    renderControls();
  }, delay);
}

queueRender(250);
window.addEventListener('hashchange', () => queueRender());
window.addEventListener('storage', () => queueRender());
new MutationObserver(() => queueRender()).observe(document.querySelector('[data-app-shell-root]') || document.body, { childList: true, subtree: true });
window.setInterval(() => {
  if (activeTimerProjects().some((project) => project.running)) renderControls();
}, 1000);
