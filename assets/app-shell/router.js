const defaultRoute = 'dashboard';

export function getRouteFromHash(hash = window.location.hash) {
  return hash.replace(/^#\/?/, '').trim();
}

export function normalizeRoute(route) {
  const normalized = String(route ?? '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .toLowerCase();

  return normalized || defaultRoute;
}

export function routeToHash(route) {
  return `#/${normalizeRoute(route)}`;
}

export function navigateTo(route) {
  window.location.hash = routeToHash(route);
}

export function bindHashRouter(onRouteChange) {
  const emitRoute = () => onRouteChange(normalizeRoute(getRouteFromHash()));

  window.addEventListener('hashchange', emitRoute);
  emitRoute();

  return () => window.removeEventListener('hashchange', emitRoute);
}
