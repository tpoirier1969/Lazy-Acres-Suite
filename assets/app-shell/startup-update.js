const CURRENT_ENTRY_VERSION = '0.1.32';
const UPDATE_SESSION_KEY = 'lazy-acres-update-check-0.1.32';

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

function versionedUrl(version, entry = 'shortcut.html', route = '#/dashboard') {
  const url = new URL(entry || 'shortcut.html', window.location.href);
  url.searchParams.set('v', version);
  url.hash = route || window.location.hash || '#/dashboard';
  return url.toString();
}

async function checkForShortcutUpdate() {
  try {
    const currentUrl = new URL(window.location.href);
    const currentVersion = currentUrl.searchParams.get('v') || CURRENT_ENTRY_VERSION;
    const alreadyChecked = sessionStorage.getItem(UPDATE_SESSION_KEY);
    if (alreadyChecked === currentVersion) return;
    sessionStorage.setItem(UPDATE_SESSION_KEY, currentVersion);

    const response = await fetch(`version.json?ts=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return;
    const info = await response.json();
    const latestVersion = String(info?.version || '').trim();
    if (!latestVersion || !isNewerVersion(latestVersion, currentVersion)) return;

    sessionStorage.setItem(UPDATE_SESSION_KEY, latestVersion);
    window.location.replace(versionedUrl(latestVersion, info.entry || 'shortcut.html', info.route || window.location.hash || '#/dashboard'));
  } catch (error) {
    console.warn('Shortcut update check failed.', error);
  }
}

checkForShortcutUpdate();
