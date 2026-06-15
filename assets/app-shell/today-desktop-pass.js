import { addShoppingItem, getDashboardSnapshot } from './dashboard-data-live.js?v=0.1.32';
import { getModuleBySlug } from './modules.js?v=0.1.29';

const DISPLAY_VERSION = 'v0.1.32';
const ICON_VERSION = '0.1.32';
const FORAGING_URL = 'https://tpoirier1969.github.io/up-foraging-guide/Fixed-Site/index.html';
let shoppingQuickAddBound = false;

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function installStableTodayHover() {
  if (document.getElementById('lazy-acres-stable-today-hover')) return;
  const style = document.createElement('style');
  style.id = 'lazy-acres-stable-today-hover';
  style.textContent = `
    .today-tile,
    .today-tile:hover,
    .today-tile-clickable,
    .today-tile-clickable:hover {
      transform: none !important;
      translate: none !important;
    }
    .shopping-quick-add {
      display: grid;
      grid-template-columns: minmax(0, 1fr) max-content;
      gap: 6px;
      align-items: center;
      margin: 5px 0 5px;
    }
    .shopping-quick-add input {
      width: 100%;
      min-width: 0;
      border: 1px solid rgb(80 92 72 / 0.22);
      border-radius: 12px;
      padding: 8px 10px;
      font: inherit;
      font-size: 0.78rem;
      background: rgb(255 255 255 / 0.78);
      color: var(--ink);
    }
    .shopping-quick-add button {
      width: auto !important;
      min-width: 0 !important;
      justify-self: end;
      border: 1px solid rgb(49 95 72 / 0.34);
      border-radius: 12px;
      padding: 8px 10px;
      font: inherit;
      font-size: 0.78rem;
      font-weight: 850;
      line-height: 1;
      background: rgb(49 95 72 / 0.10);
      color: var(--ink);
      cursor: pointer;
      white-space: nowrap;
    }
    .shopping-quick-add-status {
      min-height: 1em;
      margin: -2px 0 3px;
      font-size: 0.68rem;
      color: color-mix(in srgb, var(--ink) 58%, var(--muted));
    }
  `;
  document.head.append(style);
}

function getModuleLaunchUrl(slug) {
  if (slug === 'foraging') return FORAGING_URL;
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

function renderShoppingQuickAdd() {
  return `
    <form class="shopping-quick-add" data-shopping-quick-add>
      <label class="sr-only" for="shoppingQuickAddInput">Add item to shopping list</label>
      <input id="shoppingQuickAddInput" name="item" type="text" autocomplete="off" placeholder="Add item…" aria-label="Add item to shopping list">
      <button type="submit">Add</button>
    </form>
    <div class="shopping-quick-add-status" data-shopping-quick-add-status aria-live="polite"></div>`;
}

function renderTodayTile(section) {
  const slug = getTodaySectionSlug(section.id);
  const classes = `today-tile today-tile-connected today-tile-${escapeHtml(section.id)}${slug ? ' today-tile-clickable' : ''}`;
  const content = `
    ${renderHeading(section)}
    ${section.id !== 'shopping' ? `<p>${escapeHtml(section.message)}</p>` : renderShoppingQuickAdd()}
    ${section.items?.length ? `<ul>${section.items.map((item) => renderTodayItem(section, item)).join('')}</ul>` : ''}`;
  if (section.id === 'shopping') return `<article class="${classes}" aria-label="${escapeHtml(section.title)}">${content}</article>`;
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

function refreshModuleIcons() {
  document.querySelectorAll('.module-icon img').forEach((img) => {
    const source = img.getAttribute('src') || '';
    if (!source.includes('/icons/field-lab/')) return;
    const cleanSource = source.split('?')[0];
    const nextSource = `${cleanSource}?v=${ICON_VERSION}`;
    if (source !== nextSource) img.setAttribute('src', nextSource);
  });
}

function refreshForagingLinks() {
  document.querySelectorAll('[data-module-slug="foraging"] a[href], a[href*="up-foraging-guide"]').forEach((link) => {
    if (link.getAttribute('href') !== FORAGING_URL) link.setAttribute('href', FORAGING_URL);
    link.setAttribute('rel', 'noopener noreferrer');
  });
}

function bindShoppingQuickAdd() {
  if (shoppingQuickAddBound) return;
  shoppingQuickAddBound = true;
  document.addEventListener('submit', async (event) => {
    const form = event.target?.closest?.('[data-shopping-quick-add]');
    if (!form) return;
    event.preventDefault();
    const input = form.querySelector('input[name="item"]');
    const button = form.querySelector('button[type="submit"]');
    const status = form.parentElement?.querySelector('[data-shopping-quick-add-status]');
    const value = String(input?.value || '').trim();
    if (!value) {
      if (status) status.textContent = 'Enter an item first.';
      input?.focus();
      return;
    }
    if (button) button.disabled = true;
    if (status) status.textContent = 'Adding…';
    try {
      await addShoppingItem(value);
      if (input) input.value = '';
      if (status) status.textContent = `Added ${value}.`;
      await refreshTodaySurface({ force: true });
    } catch (error) {
      console.warn('Shopping quick add failed.', error);
      if (status) status.textContent = error?.message || 'Could not add item.';
    } finally {
      if (button) button.disabled = false;
      input?.focus();
    }
  });
}

async function refreshTodaySurface(options = {}) {
  installStableTodayHover();
  bindShoppingQuickAdd();
  refreshDisplayedVersion();
  refreshModuleIcons();
  refreshForagingLinks();
  const surface = document.querySelector('.today-surface');
  if (!surface || (!options.force && surface.dataset.todayDesktopPass === 'rendering')) return;
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
  window.__lazyAcresTodayDesktopPassTimer = window.setTimeout(() => refreshTodaySurface(), 80);
}

installStableTodayHover();
bindShoppingQuickAdd();
refreshForagingLinks();
scheduleRefresh();
new MutationObserver(() => {
  installStableTodayHover();
  refreshDisplayedVersion();
  refreshModuleIcons();
  refreshForagingLinks();
  scheduleRefresh();
}).observe(document.documentElement, { childList: true, subtree: true });
