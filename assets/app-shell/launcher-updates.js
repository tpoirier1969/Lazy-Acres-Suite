const SUITE_BUILD = '0.1.71';

const MODULE_CONFIG = {
  shopping: {
    icon: `./assets/app-shell/icons/field-lab/Shopping.png?v=${SUITE_BUILD}`,
    url: 'https://tpoirier1969.github.io/Shopping_list/',
  },
  scheduler: {
    icon: `./assets/app-shell/icons/field-lab/scheduler.png?v=${SUITE_BUILD}`,
    url: 'https://tpoirier1969.github.io/Scheduler/',
  },
  recipes: {
    icon: `./assets/app-shell/icons/field-lab/recipes.png?v=${SUITE_BUILD}`,
    url: 'https://tpoirier1969.github.io/recipe_tracker/',
  },
  tv: {
    icon: `./assets/app-shell/icons/field-lab/tv-tracker.png?v=${SUITE_BUILD}`,
    url: 'https://tpoirier1969.github.io/tv-tracker/',
  },
  ski: {
    icon: `./assets/app-shell/icons/field-lab/ski.png?v=${SUITE_BUILD}`,
    url: 'https://tpoirier1969.github.io/Skithingy/',
  },
  'church-music': {
    icon: `./assets/app-shell/icons/field-lab/church-music.png?v=${SUITE_BUILD}`,
    url: 'https://tpoirier1969.github.io/Church_Music/',
  },
  songwriting: {
    icon: `./assets/app-shell/icons/field-lab/songwriting-approved-20260803.webp?v=${SUITE_BUILD}`,
    url: 'https://songwriting.tpoirier.workers.dev/',
  },
  foraging: {
    icon: `./assets/app-shell/icons/field-lab/foraging.png?v=${SUITE_BUILD}`,
    url: 'https://tpoirier1969.github.io/up-foraging-guide/',
  },
  camping: {
    icon: `./assets/app-shell/icons/field-lab/camping.png?v=${SUITE_BUILD}`,
    url: 'https://tpoirier1969.github.io/Camping-map-new-3-23-26/',
  },
  fishing: {
    icon: `./assets/app-shell/icons/field-lab/fishing.png?v=${SUITE_BUILD}`,
    url: null,
    disabledLabel: 'Not live',
  },
  'fly-tyer': {
    icon: `./assets/app-shell/icons/field-lab/fly-tyer-approved-20260804.png?v=${SUITE_BUILD}`,
    url: 'https://flytying-app.tpoirier.workers.dev/',
  },
  'boat-estimator': {
    icon: `./assets/app-shell/icons/field-lab/boat-estimator-approved-20260804.webp?v=${SUITE_BUILD}`,
    url: 'https://tpoirier1969.github.io/BoatBuilder/',
  },
  genealogy: {
    icon: `./assets/app-shell/icons/field-lab/genealogy.png?v=${SUITE_BUILD}`,
    url: 'https://tpoirier1969.github.io/genealogy-map/',
  },
  timer: {
    icon: `./assets/app-shell/icons/field-lab/timer-v2.svg?v=${SUITE_BUILD}`,
    url: 'https://tpoirier1969.github.io/LazyAcresTimer/',
  },
};

const STALE_LINK_REWRITES = new Map([
  ['https://tpoirier1969.github.io/up-foraging-guide/Fixed-Site/index.html', MODULE_CONFIG.foraging.url],
  ['https://flytying.tpoirier.workers.dev/', MODULE_CONFIG['fly-tyer'].url],
]);
const STALE_FISHING_URL = 'https://tpoirier1969.github.io/Fishing-Logbook/';

function normalizeExternalAnchor(anchor, url) {
  if (anchor.getAttribute('href') !== url) anchor.setAttribute('href', url);
  if (anchor.getAttribute('target') !== '_blank') anchor.setAttribute('target', '_blank');
  if (anchor.getAttribute('rel') !== 'noopener noreferrer') anchor.setAttribute('rel', 'noopener noreferrer');
}

function disableControl(control, label = 'Not live') {
  if (control.tagName === 'BUTTON') {
    if (control.getAttribute('type') !== 'button') control.setAttribute('type', 'button');
    if (!control.disabled) control.disabled = true;
    if (control.textContent !== label) control.textContent = label;
    if (control.hasAttribute('aria-disabled')) control.removeAttribute('aria-disabled');
    return control;
  }

  const button = document.createElement('button');
  button.className = control.className;
  button.type = 'button';
  button.disabled = true;
  button.textContent = label;
  button.setAttribute('aria-label', 'Fishing Logbook is not live yet');
  control.replaceWith(button);
  return button;
}

function ensureExternalControl(control, url) {
  if (control.tagName === 'A') {
    normalizeExternalAnchor(control, url);
    return control;
  }

  const anchor = document.createElement('a');
  anchor.className = control.className;
  anchor.textContent = control.textContent || 'Open';
  normalizeExternalAnchor(anchor, url);
  control.replaceWith(anchor);
  return anchor;
}

function applyCardConfig(card) {
  const slug = card.dataset.moduleSlug;
  const config = MODULE_CONFIG[slug];
  if (!config) return;

  let icon = card.querySelector('.module-icon');
  if (!icon) {
    icon = document.createElement('span');
    icon.className = 'module-icon';
    icon.setAttribute('aria-hidden', 'true');
    card.querySelector('.module-card__top')?.prepend(icon);
  }

  let image = icon.querySelector('img');
  if (!image) {
    image = document.createElement('img');
    image.alt = '';
    image.loading = 'eager';
    image.decoding = 'async';
    icon.replaceChildren(image);
  }

  if (!image.dataset.launcherIconGuard) {
    image.dataset.launcherIconGuard = 'true';
    image.addEventListener('load', () => icon.classList.remove('module-icon-missing'));
    image.addEventListener('error', () => icon.classList.add('module-icon-missing'));
  }

  icon.classList.remove('module-icon-missing');
  if (image.getAttribute('src') !== config.icon) image.setAttribute('src', config.icon);

  const control = card.querySelector('.module-open-button');
  if (!control) return;
  if (config.url) ensureExternalControl(control, config.url);
  else disableControl(control, config.disabledLabel);
}

function repairStaleLinks() {
  document.querySelectorAll('a[href]').forEach((anchor) => {
    const absoluteUrl = anchor.href;
    if (STALE_LINK_REWRITES.has(absoluteUrl)) {
      normalizeExternalAnchor(anchor, STALE_LINK_REWRITES.get(absoluteUrl));
      return;
    }

    if (absoluteUrl !== STALE_FISHING_URL) return;
    if (anchor.matches('.button, .module-open-button')) {
      disableControl(anchor, MODULE_CONFIG.fishing.disabledLabel);
      return;
    }

    if (anchor.getAttribute('href') !== '#/fishing') anchor.setAttribute('href', '#/fishing');
    if (anchor.hasAttribute('target')) anchor.removeAttribute('target');
    if (anchor.hasAttribute('rel')) anchor.removeAttribute('rel');
  });
}

function applyLauncherUpdates() {
  document.querySelectorAll('[data-module-card][data-module-slug]').forEach(applyCardConfig);
  repairStaleLinks();

  const versionFlag = document.querySelector('.version-flag');
  if (versionFlag && versionFlag.textContent !== `v${SUITE_BUILD}`) {
    versionFlag.textContent = `v${SUITE_BUILD}`;
    versionFlag.setAttribute('aria-label', `App version ${SUITE_BUILD}`);
  }
}

function openConfiguredModule(slug) {
  const config = MODULE_CONFIG[slug];
  if (!config) return false;

  if (!config.url) {
    window.location.hash = '#/fishing';
    return true;
  }

  const opened = window.open(config.url, '_blank', 'noopener,noreferrer');
  if (!opened) window.location.href = config.url;
  return true;
}

document.addEventListener('change', (event) => {
  const select = event.target.closest?.('[data-mobile-preferences]');
  if (!select) return;

  const [kind, slug] = String(select.value || '').split(':');
  if (kind !== 'open' || !MODULE_CONFIG[slug]) return;

  event.stopImmediatePropagation();
  select.value = '';
  openConfiguredModule(slug);
}, true);

let updateScheduled = false;
function scheduleLauncherUpdates() {
  if (updateScheduled) return;
  updateScheduled = true;
  window.requestAnimationFrame(() => {
    updateScheduled = false;
    applyLauncherUpdates();
  });
}

const observer = new MutationObserver(scheduleLauncherUpdates);
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

window.addEventListener('pageshow', scheduleLauncherUpdates);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) scheduleLauncherUpdates();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', scheduleLauncherUpdates, { once: true });
} else {
  scheduleLauncherUpdates();
}
