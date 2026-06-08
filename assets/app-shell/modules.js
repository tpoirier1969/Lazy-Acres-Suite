export const moduleGroups = [
  {
    id: 'household',
    title: 'Household modules',
    description: 'Family and home tools.',
  },
  {
    id: 'commercial-candidate',
    title: 'Commercial modules',
    description: 'Customer-facing tools.',
  },
  {
    id: 'work',
    title: 'Work modules',
    description: 'Professional tools.',
  },
];

export const moduleRegistry = [
  {
    slug: 'shopping',
    title: 'Our Shopping List',
    description: 'Shopping lists, store categories, trip packing notes, and errands.',
    status: 'legacy-link',
    group: 'household',
    legacyUrl: 'https://tpoirier1969.github.io/Shopping_list/',
    legacyLabel: 'Open',
  },
  {
    slug: 'scheduler',
    title: 'Our Scheduler',
    description: 'Shared calendar and schedule planning.',
    status: 'legacy-link',
    group: 'household',
    legacyUrl: 'https://tpoirier1969.github.io/Scheduler/',
    legacyLabel: 'Open',
  },
  {
    slug: 'recipes',
    title: 'Recipe Tracker',
    description: 'Recipes, source photos, tags, pantry matching, and print helpers.',
    status: 'legacy-link',
    group: 'household',
    legacyUrl: 'https://tpoirier1969.github.io/recipe_tracker/',
    legacyLabel: 'Open',
  },
  {
    slug: 'tv',
    title: 'TV Lineup Tracker',
    description: 'TV series, watch progress, and what we are currently watching.',
    status: 'legacy-link',
    group: 'household',
    legacyUrl: 'https://tpoirier1969.github.io/tv-tracker/',
    legacyLabel: 'Open',
  },
  {
    slug: 'ski',
    title: 'Ski Map',
    description: 'Ski routes, outings, conditions, and trail notes.',
    status: 'legacy-link',
    group: 'household',
    legacyUrl: 'https://tpoirier1969.github.io/Skithingy/',
    legacyLabel: 'Open',
  },
  {
    slug: 'church-music',
    title: 'Canticle Cabinet',
    description: 'Church music and canticle tools.',
    status: 'legacy-link',
    group: 'household',
    legacyUrl: 'https://tpoirier1969.github.io/Church_Music/',
    legacyLabel: 'Open',
  },
  {
    slug: 'foraging',
    title: 'UP Foraging Guide',
    description: 'Upper Michigan foraging records, seasonal discovery, safety notes, and lookalike warnings.',
    status: 'legacy-link',
    group: 'commercial-candidate',
    legacyUrl: 'https://tpoirier1969.github.io/up-foraging-guide/',
    legacyLabel: 'Open',
  },
  {
    slug: 'camping',
    title: 'Camping Map',
    description: 'Boondocking and camping planning with map layers, routes, outlines, and verification notes.',
    status: 'legacy-link',
    group: 'commercial-candidate',
    legacyUrl: 'https://tpoirier1969.github.io/Camping-map-new-3-23-26/',
    legacyLabel: 'Open',
  },
  {
    slug: 'fishing',
    title: 'Fishing Logbook',
    description: 'Fishing trips, conditions, catches, locations, and gear notes.',
    status: 'legacy-link',
    group: 'commercial-candidate',
    legacyUrl: 'https://tpoirier1969.github.io/Fishing-Logbook/',
    legacyLabel: 'Open',
  },
  {
    slug: 'genealogy',
    title: 'Genealogy Map',
    description: 'Family history mapping and genealogy exploration tools.',
    status: 'legacy-link',
    group: 'commercial-candidate',
    legacyUrl: 'https://tpoirier1969.github.io/genealogy-map/',
    legacyLabel: 'Open',
  },
];

export function getModuleBySlug(slug) {
  return moduleRegistry.find((appModule) => appModule.slug === slug) ?? null;
}

export function getModulesByGroup(groupId) {
  return moduleRegistry.filter((appModule) => appModule.group === groupId);
}
