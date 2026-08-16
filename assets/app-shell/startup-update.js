const CURRENT_ENTRY_VERSION = '0.1.80';
const UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60_000;
const SOURCE_REVISION_URL = 'https://api.github.com/repos/tpoirier1969/Lazy-Acres-Suite/commits/main';
const SOURCE_REVISION_STORAGE_KEY = 'lazy-acres-suite-main-revision';

let lastCheckAt = 0;
let lastSourceRevisionCheckAt = 0;
let activeCheck = null;
let activeSourceRevisionCheck = null;
let observedSourceRevision = readStoredSourceRevision();
let latestReloadInfo = {
  version: CURRENT_ENTRY_VERSION,
  entry: 'shortcut.html',
  route: '#/dashboard',
};

function parseVersion(value = '') {
  return String(value || '')
    .replace(/^v/i, '')
    .split('.')
    .map((part) => Number.parseInt(part, 10))
    .map((part) => Number.isFinite(part) ? part : 0);
}

function isNewerVersion(remote, current) {
  const a = parseVersion(remote);
  const b = parseVersion(current);
  const length = Math.max(a.length, b.length);

  for (let index = 0; index < length; index += 1) {
    const av = a[index] || 0;
    const bv = b[index] || 0;
    if (av > bv) return true;
    if (av < bv) return false;
  }

  return false;
}

function getEmbeddedVersion() {
  return document.documentElement.dataset.suiteBuild || CURRENT_ENTRY_VERSION;
}

function readStoredSourceRevision() {
  try {
    return sessionStorage.getItem(SOURCE_REVISION_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function storeSourceRevision(revision) {
  observedSourceRevision = revision;
  try {
    sessionStorage.setItem(SOURCE_REVISION_STORAGE_KEY, revision);
  } catch {
    // The in-memory copy still lets an open page detect later revisions.
  }
}

function versionedUrl(version, entry = 'shortcut.html', route = '#/dashboard') {
  const url = new URL(entry || 'shortcut.html', window.location.href);
  url.searchParams.set('v', version);
  url.searchParams.set('reload', String(Date.now()));
  url.hash = window.location.hash || route || '#/dashboard';
  return url.toString();
}

function reloadLatestLandingPage() {
  window.location.replace(
    versionedUrl(
      latestReloadInfo.version || getEmbeddedVersion(),
      latestReloadInfo.entry || 'shortcut.html',
      latestReloadInfo.route || window.location.hash || '#/dashboard',
    ),
  );
}

async function checkForShortcutUpdate({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastCheckAt < UPDATE_CHECK_INTERVAL_MS) return false;
  if (activeCheck) return activeCheck;

  lastCheckAt = now;
  activeCheck = (async () => {
    try {
      const response = await fetch(`./version.json?ts=${Date.now()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return false;

      const info = await response.json();
      const latestVersion = String(info?.version || info?.build || '').trim();
      const embeddedVersion = getEmbeddedVersion();

      latestReloadInfo = {
        version: latestVersion || embeddedVersion,
        entry: info?.entry || 'shortcut.html',
        route: info?.route || window.location.hash || '#/dashboard',
      };

      if (!latestVersion || !isNewerVersion(latestVersion, embeddedVersion)) return false;

      reloadLatestLandingPage();
      return true;
    } catch (error) {
      console.warn('Shortcut update check failed.', error);
      return false;
    } finally {
      activeCheck = null;
    }
  })();

  return activeCheck;
}

async function checkForSourceRevision({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastSourceRevisionCheckAt < UPDATE_CHECK_INTERVAL_MS) return false;
  if (activeSourceRevisionCheck) return activeSourceRevisionCheck;

  lastSourceRevisionCheckAt = now;
  activeSourceRevisionCheck = (async () => {
    try {
      const response = await fetch(`${SOURCE_REVISION_URL}?ts=${Date.now()}`, {
        cache: 'no-store',
        headers: { Accept: 'application/vnd.github+json' },
      });
      if (!response.ok) return false;

      const info = await response.json();
      const latestRevision = String(info?.sha || '').trim();
      if (!latestRevision) return false;

      const previousRevision = observedSourceRevision || readStoredSourceRevision();
      if (!previousRevision) {
        storeSourceRevision(latestRevision);
        return false;
      }
      if (latestRevision === previousRevision) return false;

      // Store the new revision before replacing the page so this cannot reload-loop.
      storeSourceRevision(latestRevision);
      reloadLatestLandingPage();
      return true;
    } catch (error) {
      console.warn('Landing page source revision check failed.', error);
      return false;
    } finally {
      activeSourceRevisionCheck = null;
    }
  })();

  return activeSourceRevisionCheck;
}

async function checkForUpdates({ force = false } = {}) {
  const versionReloadStarted = await checkForShortcutUpdate({ force });
  if (versionReloadStarted) return;
  await checkForSourceRevision({ force });
}

window.addEventListener('pageshow', () => checkForUpdates());
window.addEventListener('focus', () => checkForUpdates());
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) checkForUpdates();
});
window.setInterval(() => checkForUpdates({ force: true }), UPDATE_CHECK_INTERVAL_MS);

checkForUpdates({ force: true });
