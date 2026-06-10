import { getDashboardSnapshot } from './dashboard-data-live.js?v=0.1.22';
import { getModuleBySlug } from './modules.js?v=0.1.18';

const DISPLAY_VERSION = 'v0.1.26';

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function getModuleLaunchUrl(slug) {
  const appModule = getModuleBySlug(slug);
  return appModule?.legacyUrl || `#/${slug}`;
}

function getExternalLinkAttrs(url) {
  return /^https?:\/\//i.test(url) ? ' rel="noopener noreferrer"' : '';
}

function getTodaySectionSlug(sectionId) {
  if (sectionId === 'scheduler') return 'scheduler';
  if (sectionId === 'shopping') return 'shopping';
  if (sectionId === 'tv') return 'tv';
  return '';
}

function renderTodayItem(section, item) {
  const text = typeof item === 'string' ? item : String(item?.text || item?.title || item?.label || '');
  if (!text) return '';
  return `<li>${escapeHtml(text)}</li>`;
}

function renderHeading(section) {
  const message = section.id === 'shopping' ? `<span class="shopping-count-line">${escapeHtml(section.message)}</span>` : '';
  return `<div class="today-tile-heading"><h3>${escapeHtml(section.title)}</h3>${message}</div>`;
}

function renderTodayTile(section) {
  const slug = getTodaySectionSlug(section.id);
  const classes = `today-tile today-tile-connected today-tile-${escapeHtml(section.id)}${slug ? ' today-tile-clickable' : ''}`;
  const content = `
    ${renderHeading(section)}
    ${section.id !== 'shopping' ? `<p>${escapeHtml(section.message)}</p>` : ''}
    ${section.items?.length ? `<ul>${section.items.map((item) => renderTodayItem(section, item)).join('')}</ul>` : ''}`;
  if (!slug) return `<article class="${classes}">${content}</article>`;
  const url = getModuleLaunchUrl(slug);
  return `<a class="${classes}" href="${escapeHtml(url)}"${getExternalLinkAttrs(url)} aria-label="Open ${escapeHtml(section.title)}">${content}</a>`;
}

function refreshDisplayedVersion() {
  document.querySelectorAll('.version-flag').forEach((flag) => {
    if (flag.textContent !== DISPLAY_VERSION) flag.textContent = DISPLAY_VERSION;
    flag.setAttribute('aria-label', `App version ${DISPLAY_VERSION}`);
  });
}

async function refreshTodaySurface() {
  refreshDisplayedVersion();
  const surface = document.querySelector('.today-surface');
  if (!surface || surface.dataset.todayDesktopPass === 'rendering') return;
  surface.dataset.todayDesktopPass = 'rendering';
  try {
    const snapshot = await getDashboardSnapshot();
    const sections = (snapshot.sections || []).filter((section) => section.state === 'connected');
    surface.innerHTML = sections.map(renderTodayTile).join('');
    surface.dataset.todayDesktopPass = 'done';
  } catch (error) {
    console.warn('Today surface refresh failed.', error);
    surface.dataset.todayDesktopPass = 'failed';
  }
}

function scheduleRefresh() {
  window.clearTimeout(window.__lazyAcresTodayDesktopPassTimer);
  window.__lazyAcresTodayDesktopPassTimer = window.setTimeout(refreshTodaySurface, 80);
}

scheduleRefresh();
new MutationObserver(() => {
  refreshDisplayedVersion();
  scheduleRefresh();
}).observe(document.documentElement, { childList: true, subtree: true });
