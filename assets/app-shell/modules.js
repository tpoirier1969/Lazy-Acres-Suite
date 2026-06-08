export const moduleGroups = [
  {
    id: 'household',
    title: 'Household modules',
    description: 'Family and home tools that should stay private to the household when real auth is added.',
  },
  {
    id: 'commercial-candidate',
    title: 'Commercial-candidate modules',
    description: 'Ideas that may later become paid or customer-facing products after entitlement work exists.',
  },
  {
    id: 'work',
    title: 'Work modules',
    description: 'Professional or operational tools that may require separate policies in the future.',
  },
];

export const moduleRegistry = [
  {
    slug: 'shopping',
    title: 'Our Shopping List',
    description: 'Shared household shopping lists, store categories, trip packing notes, and errands.',
    status: 'Legacy link / future native module',
    group: 'household',
    legacyUrl: 'https://tpoirier1969.github.io/Shopping_list/',
    legacyLabel: 'Open current Shopping List',
  },
  {
    slug: 'scheduler',
    title: 'Our Scheduler',
    description: 'Shared calendar and household schedule planning for Tod, Donna, Frank, and shared events.',
    status: 'Legacy link / future native module',
    group: 'household',
    legacyUrl: 'https://tpoirier1969.github.io/Scheduler/',
    legacyLabel: 'Open current Scheduler',
  },
  {
    slug: 'recipes',
    title: 'Recipe Tracker',
    description: 'Recipe storage, OCR cleanup, source photos, tags, pantry matching, and print helpers.',
    status: 'Legacy link / future native module',
    group: 'household',
    legacyUrl: 'https://tpoirier1969.github.io/recipe_tracker/',
    legacyLabel: 'Open current Recipe Tracker',
  },
  {
    slug: 'tv',
    title: 'TV Lineup Tracker',
    description: 'Personal tracker for TV series, watch progress, and what Tod and Donna are currently watching.',
    status: 'Personal household app / legacy link',
    group: 'household',
    legacyUrl: 'https://tpoirier1969.github.io/tv-tracker/',
    legacyLabel: 'Open current TV Lineup Tracker',
  },
  {
    slug: 'ski',
    title: 'Ski Map',
    description: 'Personal ski route and outing map tools; useful privately, not a commercial candidate.',
    status: 'Personal household app / legacy link',
    group: 'household',
    legacyUrl: 'https://tpoirier1969.github.io/Skithingy/',
    legacyLabel: 'Open current Ski Map',
  },
  {
    slug: 'church-music',
    title: 'Canticle Cabinet',
    description: 'Church music and canticle cabinet tools.',
    status: 'Household / ministry utility legacy link',
    group: 'household',
    legacyUrl: 'https://tpoirier1969.github.io/Church_Music/',
    legacyLabel: 'Open current Canticle Cabinet',
  },
  {
    slug: 'foraging',
    title: 'UP Foraging Guide',
    description: 'Upper Michigan foraging records, seasonal discovery, safety notes, and lookalike warnings.',
    status: 'Commercial candidate / legacy link',
    group: 'commercial-candidate',
    legacyUrl: 'https://tpoirier1969.github.io/up-foraging-guide/',
    legacyLabel: 'Open current Foraging Guide',
  },
  {
    slug: 'camping',
    title: 'Camping Map',
    description: 'Boondocking and camping planning with map layers, routes, outlines, and verification notes.',
    status: 'Commercial candidate / legacy link',
    group: 'commercial-candidate',
    legacyUrl: 'https://tpoirier1969.github.io/Camping-map-new-3-23-26/',
    legacyLabel: 'Open current Camping Map',
  },
  {
    slug: 'fishing',
    title: 'Fishing Logbook',
    description: 'Fishing trips, conditions, catches, locations, and gear notes.',
    status: 'Commercial candidate / planned native module',
    group: 'commercial-candidate',
    legacyUrl: 'https://tpoirier1969.github.io/Fishing-Logbook/',
    legacyLabel: 'Open current Fishing Logbook',
  },
  {
    slug: 'genealogy',
    title: 'Genealogy Map',
    description: 'Family history mapping and genealogy exploration tools.',
    status: 'Commercial candidate / legacy link',
    group: 'commercial-candidate',
    legacyUrl: 'https://tpoirier1969.github.io/genealogy-map/',
    legacyLabel: 'Open current Genealogy Map',
  },
];

export function getModuleBySlug(slug) {
  return moduleRegistry.find((appModule) => appModule.slug === slug) ?? null;
}

export function getModulesByGroup(groupId) {
  return moduleRegistry.filter((appModule) => appModule.group === groupId);
}
