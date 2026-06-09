const PHOTO_ICON_URL = './assets/app-shell/mountain-photo-icon.png?v=0.1.21';

function applyPhotoIcon() {
  document.querySelectorAll('.brand-icon').forEach((img) => {
    if (img.getAttribute('src') !== PHOTO_ICON_URL) {
      img.setAttribute('src', PHOTO_ICON_URL);
    }
  });

  document.querySelectorAll('link[rel~="icon"]').forEach((link) => {
    if (link.getAttribute('href') !== PHOTO_ICON_URL) {
      link.setAttribute('href', PHOTO_ICON_URL);
      link.setAttribute('type', 'image/png');
    }
  });
}

applyPhotoIcon();

new MutationObserver(() => applyPhotoIcon()).observe(document.documentElement, {
  childList: true,
  subtree: true,
});
