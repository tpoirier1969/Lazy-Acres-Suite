const SUITE_BUILD = '0.1.66';

const MODULE_ICON_OVERRIDES = {
  'boat-estimator': `./assets/app-shell/icons/field-lab/boat-estimator-approved-20260803.webp?v=${SUITE_BUILD}`,
  timer: `./assets/app-shell/icons/field-lab/timer-v2.svg?v=${SUITE_BUILD}`,
  songwriting: `./assets/app-shell/icons/field-lab/songwriting-approved-20260803.webp?v=${SUITE_BUILD}`,
  'fly-tyer': `./assets/app-shell/icons/field-lab/fly-tyer-approved-20260804.png?v=${SUITE_BUILD}`,
};

function applyLauncherUpdates() {
  document.querySelectorAll('[data-module-card][data-module-slug]').forEach((card) => {
    const slug = card.dataset.moduleSlug;
    const iconUrl = MODULE_ICON_OVERRIDES[slug];
    if (!iconUrl) return;

    let icon = card.querySelector('.module-icon');
    if (!icon) {
      icon = document.createElement('span');
      icon.className = 'module-icon';
      icon.setAttribute('aria-hidden', 'true');
      card.querySelector('.module-card__top')?.prepend(icon);
    }

    icon.classList.remove('module-icon-missing');
    let image = icon.querySelector('img');
    if (!image) {
      image = document.createElement('img');
      image.alt = '';
      image.loading = 'eager';
      image.decoding = 'async';
      icon.replaceChildren(image);
    }

    if (image.getAttribute('src') !== iconUrl) {
      image.setAttribute('src', iconUrl);
    }
  });

  const versionFlag = document.querySelector('.version-flag');
  if (versionFlag && versionFlag.textContent !== `v${SUITE_BUILD}`) {
    versionFlag.textContent = `v${SUITE_BUILD}`;
    versionFlag.setAttribute('aria-label', `App version ${SUITE_BUILD}`);
  }
}

const observer = new MutationObserver(applyLauncherUpdates);
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['src'],
});

window.addEventListener('pageshow', applyLauncherUpdates);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) applyLauncherUpdates();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyLauncherUpdates, { once: true });
} else {
  applyLauncherUpdates();
}
