const DEFAULT_UNAVAILABLE_MESSAGES = {
  scheduler: 'Calendar source not connected.',
  weather: 'Weather source not connected.',
  recent: 'No recent activity source connected.',
  shopping: 'Shopping list source not connected.',
};

export const dashboardDataRequirements = [
  {
    id: 'scheduler',
    title: 'Calendar',
    missing: 'A readable Scheduler adapter or exported calendar data source.',
  },
  {
    id: 'weather',
    title: 'Weather',
    missing: 'A browser-safe weather adapter or public forecast feed.',
  },
  {
    id: 'recent',
    title: 'Recent',
    missing: 'A readable recent-activity adapter or local module activity export.',
  },
  {
    id: 'shopping',
    title: 'Shopping',
    missing: 'A readable Shopping List adapter or exported list data source.',
  },
];

function getAdapterRegistry() {
  if (typeof window === 'undefined') return {};

  const registry = window.LAZY_ACRES_DASHBOARD_ADAPTERS;
  return registry && typeof registry === 'object' ? registry : {};
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return '';
      return [item.time, item.title, item.label, item.name, item.note].filter(Boolean).join(' ');
    })
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);
}

function unavailableSection(requirement, message = DEFAULT_UNAVAILABLE_MESSAGES[requirement.id]) {
  return {
    id: requirement.id,
    title: requirement.title,
    state: 'unavailable',
    message,
    items: [],
    missing: requirement.missing,
  };
}

async function readSection(requirement, adapters) {
  const adapter = adapters[requirement.id] || (requirement.id === 'recent' ? adapters['recent-activity'] : undefined);

  if (typeof adapter !== 'function') {
    return unavailableSection(requirement);
  }

  try {
    const result = await adapter();

    if (!result || result.connected !== true) {
      return unavailableSection(requirement, result?.message || DEFAULT_UNAVAILABLE_MESSAGES[requirement.id]);
    }

    return {
      id: requirement.id,
      title: result.title || requirement.title,
      state: 'connected',
      message: result.message || result.headline || 'Connected.',
      items: normalizeItems(result.items),
      missing: '',
    };
  } catch (error) {
    console.error(error);
    return unavailableSection(requirement, 'This source is configured, but it failed to load.');
  }
}

export async function getDashboardSnapshot() {
  const adapters = getAdapterRegistry();
  const sections = await Promise.all(dashboardDataRequirements.map((requirement) => readSection(requirement, adapters)));
  const connected = sections.filter((section) => section.state === 'connected').length;
  const unavailable = sections.length - connected;

  return {
    status: connected > 0 ? 'partial' : 'unavailable',
    generatedAt: new Date().toISOString(),
    sections,
    summary: {
      connected,
      unavailable,
      total: sections.length,
    },
    missingConfig: sections
      .filter((section) => section.state !== 'connected')
      .map((section) => section.missing)
      .filter(Boolean),
  };
}
