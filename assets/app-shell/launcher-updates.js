const SUITE_BUILD = '0.1.62';

const MODULE_ICON_OVERRIDES = {
  'boat-estimator': `./assets/app-shell/icons/field-lab/boat-estimator-v2.svg?v=${SUITE_BUILD}`,
  timer: `./assets/app-shell/icons/field-lab/timer-v2.svg?v=${SUITE_BUILD}`,
  songwriting: `./assets/app-shell/icons/field-lab/songwriting.svg?v=${SUITE_BUILD}`,
};

function applyLauncherUpdates() {
  document.querySelectorAll('[data-module-card][data-module-slug]').forEach((card) => {
    const slug = card.dataset.moduleSlug;
    const iconUrl = MODULE_ICON_OVERRIDES[slug];
    if (!iconUrl) return;

    const image = card.querySelector('.module-icon img');
    if (image && image.getAttribute('src') !== iconUrl) {
      image.setAttribute('src', iconUrl);
      image.setAttribute('loading', 'eager');
      image.setAttribute('decoding', 'async');
    }
  });

  const versionFlag = document.querySelector('.version-flag');
  if (versionFlag && versionFlag.textContent !== `v${SUITE_BUILD}`) {
    versionFlag.textContent = `v${SUITE_BUILD}`;
    versionFlag.setAttribute('aria-label', `App version ${SUITE_BUILD}`);
  }
}

const observer = new MutationObserver(applyLauncherUpdates);
observer.observe(document.documentElement, { childList: true, subtree: true });

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', applyLauncherUpdates, { once: true });
} else {
  applyLauncherUpdates();
}
