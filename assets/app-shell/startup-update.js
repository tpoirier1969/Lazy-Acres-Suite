const CURRENT_ENTRY_VERSION = '0.1.65';
const MINIMUM_CHECK_GAP_MS = 15_000;
const PERIODIC_CHECK_MS = 5 * 60_000;

let lastCheckAt = 0;
let activeCheck = null;

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

function versionedUrl(version, entry = 'shortcut.html', route = '#/dashboard') {
  const url = new URL(entry || 'shortcut.html', window.location.href);
  url.searchParams.set('v', version);
  url.searchParams.set('reload', String(Date.now()));
  url.hash = window.location.hash || route || '#/dashboard';
  return url.toString();
}

async function checkForShortcutUpdate({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastCheckAt < MINIMUM_CHECK_GAP_MS) return;
  if (activeCheck) return activeCheck;

  lastCheckAt = now;
  activeCheck = (async () => {
    try {
      const response = await fetch(`./version.json?ts=${Date.now()}`, {
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) return;

      const info = await response.json();
      const latestVersion = String(info?.version || info?.build || '').trim();
      const embeddedVersion = getEmbeddedVersion();
      if (!latestVersion || !isNewerVersion(latestVersion, embeddedVersion)) return;

      window.location.replace(
        versionedUrl(
          latestVersion,
          info.entry || 'shortcut.html',
          info.route || window.location.hash || '#/dashboard',
        ),
      );
    } catch (error) {
      console.warn('Shortcut update check failed.', error);
    } finally {
      activeCheck = null;
    }
  })();

  return activeCheck;
}

window.addEventListener('pageshow', () => checkForShortcutUpdate({ force: true }));
window.addEventListener('focus', () => checkForShortcutUpdate());
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) checkForShortcutUpdate();
});
window.setInterval(() => checkForShortcutUpdate({ force: true }), PERIODIC_CHECK_MS);

checkForShortcutUpdate({ force: true });
