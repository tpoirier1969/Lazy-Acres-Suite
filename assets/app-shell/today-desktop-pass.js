import { addShoppingItem, getDashboardSnapshot } from './dashboard-data-live.js?v=0.1.37';
import { getModuleBySlug } from './modules.js?v=0.1.29';

const DISPLAY_VERSION = 'v0.1.37';
const ICON_VERSION = '0.1.37';
const FORAGING_URL = 'https://tpoirier1969.github.io/up-foraging-guide/Fixed-Site/index.html';
let shoppingQuickAddBound = false;
let todaySurfaceRenderInFlight = false;

function escapeHtml(value) {
  return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function installStableTodayHover() {
  let style = document.getElementById('lazy-acres-stable-today-hover');
  if (!style) {
    style = document.createElement('style');
    style.id = 'lazy-acres-stable-today-hover';
    document.head.append(style);
  }
  style.textContent = `
    .today-tile,
    .today-tile:hover,
    .today-tile-clickable,
    .today-tile-clickable:hover {
      transform: none !important;
      translate: none !important;
    }
    .hero-intro {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
    }
    .hero-intro h1 {
      display: block !important;
      width: 100% !important;
      max-width: none !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: clip !important;
      font-size: clamp(1.45rem, 7.2vw, 4.9rem) !important;
      line-height: 0.98 !important;
      letter-spacing: clamp(-0.055em, -0.8vw, 0.01em) !important;
      word-spacing: normal !important;
    }
    @media (max-width: 430px) {
      .hero {
        padding-left: 14px !important;
        padding-right: 14px !important;
      }
      .hero-intro h1 {
        font-size: clamp(1.16rem, 5.7vw, 1.72rem) !important;
        letter-spacing: -0.085em !important;
      }
    }
    .today-tile-shopping {
      min-height: auto !important;
    }
    .today-tile-shopping .today-tile-heading {
      margin-bottom: 4px !important;
    }
    .shopping-quick-add {
      display: flex !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      align-items: center !important;
      gap: 6px !important;
      margin: 5px 0 5px !important;
      width: 100% !important;
      max-width: 100% !important;
    }
    .shopping-quick-add input {
      display: block !important;
      flex: 1 1 auto !important;
      width: auto !important;
      min-width: 0 !important;
      max-width: none !important;
      border: 1px solid rgb(80 92 72 / 0.22);
      border-radius: 12px;
      padding: 8px 10px;
      font: inherit;
      font-size: 0.78rem;
      background: rgb(255 255 255 / 0.78);
      color: var(--ink);
    }
    .shopping-quick-add button {
      display: inline-flex !important;
      flex: 0 0 auto !important;
      width: auto !important;
      min-width: 0 !important;
      max-width: max-content !important;
      align-items: center !important;
      justify-content: center !important;
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
    .shopping-quick-add button:disabled {
      cursor: wait;
      opacity: 0.62;
    }
    .shopping-quick-add-status {
      min-height: 1em;
      margin: -2px 0 3px;
      font-size: 0.68rem;
      color: color-mix(in srgb, var(--ink) 58%, var(--muted));
    }
    .today-tile-shopping ul {
      display: none !important;
    }
  `;
}

function fitGreetingToOneLine() {
  const heading = document.querySelector('.hero-intro h1');
  if (!heading) return;
  heading.style.removeProperty('font-size');
  heading.style.removeProperty('letter-spacing');
  const maxWidth = heading.clientWidth;
  if (!maxWidth || heading.scrollWidth <= maxWidth) return;
  const computed = window.getComputedStyle(heading);
  let size = parseFloat(computed.fontSize) || 28;
  const minSize = window.matchMedia('(max-width: 430px)').matches ? 18 : 22;
  while (size > minSize && heading.scrollWidth > maxWidth) {
    size -= 0.5;
    heading.style.setProperty('font-size', `${size}px`, 'important');
  }
  if (heading.scrollWidth > maxWidth) {
    heading.style.setProperty('letter-spacing', '-0.095em', 'important');
  }
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
  const itemList = section.id === 'shopping' ? '' : (section.items?.length ? `<ul>${section.items.map((item) => renderTodayItem(section, item)).join('')}</ul>` : '');
  const content = `
    ${renderHeading(section)}
    ${section.id !== 'shopping' ? `<p>${escapeHtml(section.message)}</p>` : renderShoppingQuickAdd()}
    ${itemList}`;
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

function setQuickAddStatus(message) {
  const status = document.querySelector('[data-shopping-quick-add-status]');
  if (status) status.textContent = message || '';
}

function focusQuickAddInput() {
  const input = document.querySelector('#shoppingQuickAddInput');
  input?.focus();
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
    const value = String(input?.value || '').trim();
    if (!value) {
      setQuickAddStatus('Enter an item first.');
      input?.focus();
      return;
    }
    if (button) button.disabled = true;
    setQuickAddStatus('Adding…');
    try {
      await addShoppingItem(value);
      if (input) input.value = '';
      await refreshTodaySurface({ force: true, preserveStatus: `Added ${value}.`, focusQuickAdd: true });
    } catch (error) {
      console.warn('Shopping quick add failed.', error);
      setQuickAddStatus(error?.message || 'Could not add item.');
      input?.focus();
    } finally {
      if (button) button.disabled = false;
    }
  });
}

async function refreshTodaySurface(options = {}) {
  installStableTodayHover();
  bindShoppingQuickAdd();
  refreshDisplayedVersion();
  refreshModuleIcons();
  refreshForagingLinks();
  fitGreetingToOneLine();
  const surface = document.querySelector('.today-surface');
  if (!surface || (todaySurfaceRenderInFlight && !options.force)) return;
  todaySurfaceRenderInFlight = true;
  surface.dataset.todayDesktopPass = 'rendering';
  try {
    const snapshot = await getDashboardSnapshot();
    const sections = (snapshot.sections || []).filter((section) => section.state === 'connected');
    surface.innerHTML = sections.map(renderTodayTile).join('');
    surface.dataset.todayDesktopPass = 'done';
    if (options.preserveStatus) setQuickAddStatus(options.preserveStatus);
    if (options.focusQuickAdd) focusQuickAddInput();
  } catch (error) {
    console.warn('Today surface refresh failed.', error);
    surface.dataset.todayDesktopPass = 'failed';
  } finally {
    todaySurfaceRenderInFlight = false;
    fitGreetingToOneLine();
  }
}

function scheduleRefresh() {
  window.clearTimeout(window.__lazyAcresTodayDesktopPassTimer);
  window.__lazyAcresTodayDesktopPassTimer = window.setTimeout(() => refreshTodaySurface(), 80);
}

function mutationNeedsRefresh(mutations) {
  return mutations.some((mutation) => {
    if (mutation.target?.closest?.('.today-surface')) return false;
    return Array.from(mutation.addedNodes || []).some((node) => {
      if (node.nodeType !== 1) return false;
      return node.matches?.('.today-surface') || node.querySelector?.('.today-surface');
    });
  });
}

installStableTodayHover();
bindShoppingQuickAdd();
refreshForagingLinks();
scheduleRefresh();
new MutationObserver((mutations) => {
  installStableTodayHover();
  refreshDisplayedVersion();
  refreshModuleIcons();
  refreshForagingLinks();
  fitGreetingToOneLine();
  if (mutationNeedsRefresh(mutations)) scheduleRefresh();
}).observe(document.documentElement, { childList: true, subtree: true });
window.addEventListener('resize', fitGreetingToOneLine);
