import { addShoppingItem } from './dashboard-data-live.js?v=0.1.52';

const STYLE_ID = 'lazy-acres-today-pass-style';
const MAX_ATTEMPTS = 60;
const RAINVIEWER_API_URL = 'https://api.rainviewer.com/public/weather-maps.json';
const RAINVIEWER_OPEN_URL = 'https://www.rainviewer.com/map.html';
const LEAFLET_CSS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS_URL = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
let attempts = 0;
let shoppingQuickAddBound = false;
let leafletPromise = null;
let rainviewerPromise = null;

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
    .hero-intro > p:not(.eyebrow),
    .command-bar,
    .module-card__actions,
    .module-card__body > p {
      display: none !important;
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
      padding: 6px 10px;
      font: inherit;
      font-size: 16px;
      line-height: 1.15;
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
    .weather-radar-link {
      display: block !important;
      cursor: pointer !important;
      color: inherit !important;
      text-decoration: none !important;
    }
    .weather-radar-link .weather-radar-frame {
      pointer-events: none !important;
    }
  `;
  document.head.append(style);
}

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-lazy-acres-leaflet]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = LEAFLET_CSS_URL;
      link.dataset.lazyAcresLeaflet = 'true';
      document.head.append(link);
    }
    const existing = document.querySelector('script[data-lazy-acres-leaflet]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L), { once: true });
      existing.addEventListener('error', () => reject(new Error('Leaflet failed to load.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.defer = true;
    script.dataset.lazyAcresLeaflet = 'true';
    script.onload = () => window.L ? resolve(window.L) : reject(new Error('Leaflet unavailable.'));
    script.onerror = () => reject(new Error('Leaflet failed to load.'));
    document.head.append(script);
  });
  return leafletPromise;
}

async function getRainviewerFrame() {
  if (!rainviewerPromise) {
    rainviewerPromise = fetch(RAINVIEWER_API_URL, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error(`RainViewer request failed: ${response.status}`);
        return response.json();
      })
      .then((data) => {
        const frames = data?.radar?.past || [];
        const latest = frames[frames.length - 1];
        if (!data?.host || !latest?.path) throw new Error('RainViewer radar frame unavailable.');
        return { host: data.host, path: latest.path, generated: data.generated || latest.time };
      });
  }
  return rainviewerPromise;
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
  document.querySelectorAll('.detail-actions a[href], .today-tile-clickable[href]').forEach((link) => {
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

function scheduleRainviewerMap(mapElement, panel) {
  if (!mapElement || mapElement.dataset.mapReady) return;
  mapElement.dataset.mapReady = 'scheduled';
  const load = () => initializeRainviewerMap(mapElement, panel);
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(load, { timeout: 2400 });
  } else {
    window.setTimeout(load, 1200);
  }
}

function ensureWeatherRadar() {
  const tile = document.querySelector('.today-tile-weather');
  if (!tile || tile.querySelector('[data-weather-radar]')) return;

  const panel = document.createElement('div');
  panel.className = 'weather-radar-panel';
  panel.dataset.weatherRadar = 'true';
  panel.innerHTML = `
    <div class="weather-radar-label">Northern Michigan radar</div>
    <a class="weather-radar-link" href="${RAINVIEWER_OPEN_URL}" target="_blank" rel="noopener noreferrer" aria-label="Open RainViewer radar">
      <div class="weather-radar-frame" data-weather-radar-map aria-label="Northern Michigan RainViewer radar map"></div>
    </a>
    <div class="weather-radar-attribution"><a href="${RAINVIEWER_OPEN_URL}" target="_blank" rel="noopener noreferrer">Radar: RainViewer</a> · Map: OpenStreetMap</div>`;
  tile.appendChild(panel);

  const mapElement = panel.querySelector('[data-weather-radar-map]');
  scheduleRainviewerMap(mapElement, panel);
}

async function initializeRainviewerMap(mapElement, panel) {
  if (!mapElement || mapElement.dataset.mapReady === 'true' || mapElement.dataset.mapReady === 'pending') return;
  mapElement.dataset.mapReady = 'pending';
  try {
    const [Leaflet, frame] = await Promise.all([loadLeaflet(), getRainviewerFrame()]);
    if (!document.body.contains(mapElement)) return;
    const map = Leaflet.map(mapElement, {
      center: [46.65, -86.1],
      zoom: 5,
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      tap: false,
    });
    Leaflet.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 7,
      minZoom: 3,
      opacity: 0.72,
    }).addTo(map);
    Leaflet.tileLayer(`${frame.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`, {
      tileSize: 256,
      maxZoom: 7,
      minZoom: 3,
      opacity: 0.82,
    }).addTo(map);
    mapElement.dataset.mapReady = 'true';
    window.requestAnimationFrame(() => map.invalidateSize(false));
  } catch (error) {
    console.warn('RainViewer radar unavailable.', error);
    mapElement.dataset.mapReady = 'failed';
    panel?.classList.add('weather-radar-unavailable');
  }
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
  decoupleShoppingTile();
  openSuiteLaunchLinksInNewPages();
  ensureShoppingQuickAdd();
  bindShoppingQuickAdd();
  ensureWeatherRadar();
  attempts += 1;
  if (attempts < MAX_ATTEMPTS) window.setTimeout(boot, 250);
}

boot();
