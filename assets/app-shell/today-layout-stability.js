const TODAY_HEIGHT_STORAGE_PREFIX = 'lazy-acres-suite-today-height-v1';
const FALLBACK_HEIGHTS = {
  desktop: 154,
  tablet: 268,
  mobile: 372,
};

function getLayoutBucket() {
  if (window.matchMedia('(max-width: 760px)').matches) return 'mobile';
  if (window.matchMedia('(max-width: 979px)').matches) return 'tablet';
  return 'desktop';
}

function getStorageKey(bucket = getLayoutBucket()) {
  return `${TODAY_HEIGHT_STORAGE_PREFIX}:${bucket}`;
}

function getReservedHeight(bucket = getLayoutBucket()) {
  const stored = Number.parseInt(localStorage.getItem(getStorageKey(bucket)) || '', 10);
  const fallback = FALLBACK_HEIGHTS[bucket];
  return Number.isFinite(stored) ? Math.max(stored, fallback) : fallback;
}

function stabilizeTodaySurface() {
  const surface = document.querySelector('.today-surface');
  if (!surface) return;

  const bucket = getLayoutBucket();
  surface.style.setProperty('min-height', `${getReservedHeight(bucket)}px`, 'important');

  const tiles = surface.querySelectorAll('.today-tile');
  if (tiles.length < 3) return;

  window.requestAnimationFrame(() => {
    if (!document.body.contains(surface)) return;
    const measuredHeight = Math.ceil(surface.getBoundingClientRect().height);
    if (!Number.isFinite(measuredHeight) || measuredHeight <= 0) return;
    const reservedHeight = Math.max(measuredHeight, FALLBACK_HEIGHTS[bucket]);
    localStorage.setItem(getStorageKey(bucket), String(reservedHeight));
    surface.style.setProperty('min-height', `${reservedHeight}px`, 'important');
  });
}

const observer = new MutationObserver(stabilizeTodaySurface);
observer.observe(document.documentElement, { childList: true, subtree: true });

window.addEventListener('resize', stabilizeTodaySurface);
window.addEventListener('pageshow', stabilizeTodaySurface);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) stabilizeTodaySurface();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', stabilizeTodaySurface, { once: true });
} else {
  stabilizeTodaySurface();
}
