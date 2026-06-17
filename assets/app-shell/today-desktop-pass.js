import { addShoppingItem } from './dashboard-data-live.js?v=0.1.48';

const DISPLAY_VERSION = 'v0.1.48';
const STYLE_ID = 'lazy-acres-today-pass-style';
const MAX_ATTEMPTS = 60;
const RADAR_EMBED_URL = 'https://embed.windy.com/embed2.html?lat=46.6&lon=-86.1&zoom=5&level=surface&overlay=radar&product=radar&menu=&message=&marker=&calendar=now&type=map&location=coordinates&detail=&detailLat=46.6&detailLon=-86.1&metricWind=mph&metricTemp=%C2%B0F';
let attempts = 0;
let shoppingQuickAddBound = false;

function installStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .hero-intro h1 {
      white-space: nowrap !important;
      overflow: visible !important;
      text-overflow: unset !important;
      font-size: clamp(1.15rem, 5.3vw, 4.2rem) !important;
      letter-spacing: -0.045em !important;
      line-height: 1.02 !important;
    }
    @media (max-width: 430px) {
      .hero-intro h1 {
        font-size: clamp(1rem, 5.25vw, 1.6rem) !important;
        letter-spacing: -0.055em !important;
      }
    }
    .today-tile-shopping ul { display: none !important; }
    .shopping-quick-add {
      display: flex !important;
      flex-flow: row nowrap !important;
      align-items: center !important;
      gap: 6px !important;
      margin: 5px 0 !important;
      width: 100% !important;
    }
    .shopping-quick-add input {
      flex: 1 1 auto !important;
      min-width: 0 !important;
      border: 1px solid rgb(80 92 72 / 0.22);
      border-radius: 12px;
      padding: 8px 10px;
      font: inherit;
      font-size: 0.78rem;
      background: rgb(255 255 255 / 0.78);
      color: var(--ink);
    }
    .shopping-quick-add button {
      flex: 0 0 auto !important;
      width: auto !important;
      min-width: 0 !important;
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

function renderShoppingQuickAdd() {
  return `
    <form class="shopping-quick-add" data-shopping-quick-add>
      <label class="sr-only" for="shoppingQuickAddInput">Add item to shopping list</label>
      <input id="shoppingQuickAddInput" name="item" type="text" autocomplete="off" placeholder="Add item…" aria-label="Add item to shopping list">
      <button type="submit">Add</button>
    </form>
    <div class="shopping-quick-add-status" data-shopping-quick-add-status aria-live="polite"></div>`;
}

function refreshDisplayedVersion() {
  document.querySelectorAll('.version-flag').forEach((flag) => {
    flag.textContent = DISPLAY_VERSION;
    flag.setAttribute('aria-label', `App version ${DISPLAY_VERSION}`);
  });
}

function decoupleShoppingTile() {
  const linkTile = document.querySelector('a.today-tile-shopping');
  if (!linkTile) return;
  const card = document.createElement('article');
  card.className = String(linkTile.className || '').replace(/\btoday-tile-clickable\b/g, '').replace(/\s+/g, ' ').trim();
  card.innerHTML = linkTile.innerHTML;
  card.setAttribute('aria-label', linkTile.getAttribute('aria-label') || 'Shopping');
  card.dataset.shoppingQuickAddOnly = 'true';
  linkTile.replaceWith(card);
}

function openSuiteLaunchLinksInNewPages() {
  document.querySelectorAll('.module-card__actions a[href], .detail-actions a[href], .today-tile-clickable[href]').forEach((link) => {
    if (link.closest('.brand') || link.classList.contains('today-tile-shopping')) return;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
  });
}

function ensureShoppingQuickAdd() {
  const tile = document.querySelector('.today-tile-shopping');
  if (!tile || tile.querySelector('[data-shopping-quick-add]')) return;
  tile.insertAdjacentHTML('beforeend', renderShoppingQuickAdd());
}

function ensureWeatherRadar() {
  const tile = document.querySelector('.today-tile-weather');
  if (!tile) return;

  if (window.matchMedia('(max-width: 979px)').matches) {
    tile.querySelector('[data-weather-radar]')?.remove();
    return;
  }

  if (tile.querySelector('[data-weather-radar]')) return;

  const panel = document.createElement('div');
  panel.className = 'weather-radar-panel';
  panel.dataset.weatherRadar = 'true';
  panel.innerHTML = `
    <div class="weather-radar-label">Northern Michigan radar</div>
    <iframe
      class="weather-radar-frame"
      src="${RADAR_EMBED_URL}"
      title="Northern Michigan radar"
      loading="lazy"
      referrerpolicy="no-referrer-when-downgrade"
      allowfullscreen>
    </iframe>`;
  tile.appendChild(panel);
}

function bindShoppingQuickAdd() {
  if (shoppingQuickAddBound) return;
  shoppingQuickAddBound = true;
  document.addEventListener('submit', async (event) => {
    const form = event.target?.closest?.('[data-shopping-quick-add]');
    if (!form) return;
    event.preventDefault();
    event.stopPropagation();
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
    } catch (error) {
      console.warn('Shopping quick add failed.', error);
      if (status) status.textContent = error?.message || 'Could not add item.';
    } finally {
      if (button) button.disabled = false;
      input?.focus();
    }
  });

  document.addEventListener('click', (event) => {
    if (!event.target?.closest?.('[data-shopping-quick-add]')) return;
    event.stopPropagation();
  }, true);
}

function boot() {
  installStyles();
  refreshDisplayedVersion();
  decoupleShoppingTile();
  openSuiteLaunchLinksInNewPages();
  ensureShoppingQuickAdd();
  ensureWeatherRadar();
  bindShoppingQuickAdd();
  attempts += 1;
  if (attempts < MAX_ATTEMPTS) window.setTimeout(boot, 250);
}

boot();
