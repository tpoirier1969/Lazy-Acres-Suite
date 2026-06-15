const SUPABASE_URL = 'https://wntakzfoprthwggkidyq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gWu_EQ1J3s0iNjeDeINJwQ_xKy8QgAJ';
const SHOPPING_SCHEMA = 'tod_donna_shared_shopping';
const SHOPPING_HOUSEHOLD_ID = 'tod-donna-shared';
const WEATHER_LATITUDE = 46.5435;
const WEATHER_LONGITUDE = -87.3954;
const TV_TRACKER_FEEDS = [
  'https://tpoirier1969.github.io/tv-tracker/data/episodes.json',
  'https://tpoirier1969.github.io/tv-tracker/episodes.json',
  'https://tpoirier1969.github.io/tv-tracker/data/tv-data.json',
  'https://tpoirier1969.github.io/tv-tracker/data.json',
];

const REQUIREMENTS = [
  { id: 'scheduler', title: 'Calendar', missing: 'A readable Scheduler adapter or exported calendar data source.' },
  { id: 'weather', title: 'Weather', missing: 'A browser-safe weather adapter or public forecast feed.' },
  { id: 'shopping', title: 'Shopping', missing: 'A readable Shopping List adapter or exported list data source.' },
  { id: 'tv', title: 'TV Tracker', missing: 'A readable TV Tracker episode feed.' },
];

const UNAVAILABLE = {
  scheduler: 'Calendar source not connected.',
  weather: 'Weather source not connected.',
  shopping: 'Shopping list source not connected.',
  tv: 'TV Tracker source not connected.',
};

let supabaseScriptPromise = null;
let supabaseClientPromise = null;

function normalizeItems(items, limit = 8) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return '';
      return [item.time, item.title, item.label, item.item_name, item.name, item.note].filter(Boolean).join(' ');
    })
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function unavailableSection(requirement, message = UNAVAILABLE[requirement.id]) {
  return { id: requirement.id, title: requirement.title, state: 'unavailable', message, items: [], missing: requirement.missing };
}

function connectedSection(requirement, message, items = [], options = {}) {
  return {
    id: requirement.id,
    title: requirement.title,
    state: 'connected',
    message,
    items: normalizeItems(items, options.limit ?? 8),
    missing: '',
  };
}

function loadSupabaseScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No browser window.'));
  if (window.supabase?.createClient) return Promise.resolve(window.supabase);
  if (!supabaseScriptPromise) {
    supabaseScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-lazy-acres-supabase]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.supabase), { once: true });
        existing.addEventListener('error', () => reject(new Error('Supabase script failed to load.')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async = true;
      script.defer = true;
      script.dataset.lazyAcresSupabase = 'true';
      script.onload = () => window.supabase?.createClient ? resolve(window.supabase) : reject(new Error('Supabase client unavailable.'));
      script.onerror = () => reject(new Error('Supabase script failed to load.'));
      document.head.appendChild(script);
    });
  }
  return supabaseScriptPromise;
}

async function getSupabaseClient() {
  if (!supabaseClientPromise) {
    supabaseClientPromise = loadSupabaseScript().then(async (supabase) => {
      const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true },
      });
      const { data: sessionData, error: sessionError } = await client.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData?.session) {
        const { error } = await client.auth.signInAnonymously();
        if (error) throw error;
      }
      return client;
    });
  }
  return supabaseClientPromise;
}

function todayIsoDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function formatEventTime(event) {
  if (event.is_all_day) return 'All day';
  const time = String(event.start_time || '').slice(0, 5);
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;
  const suffix = hours >= 12 ? 'pm' : 'am';
  return `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, '0')}${suffix}`;
}

async function readScheduler(requirement) {
  const client = await getSupabaseClient();
  const today = todayIsoDate();
  const { data, error } = await client
    .from('tod_donna_calendar_events')
    .select('*')
    .eq('event_date', today)
    .neq('status', 'cancelled')
    .order('start_time', { ascending: true })
    .limit(8);
  if (error) throw error;
  const events = data || [];
  if (!events.length) return connectedSection(requirement, 'No calendar events today.', []);
  return connectedSection(
    requirement,
    `${events.length} calendar item${events.length === 1 ? '' : 's'} today.`,
    events.slice(0, 4).map((event) => ({ time: formatEventTime(event), title: event.title || event.preset_name || 'Untitled event' })),
    { limit: 4 },
  );
}

function weatherDescription(code) {
  const descriptions = { 0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Cloudy', 45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 80: 'Rain showers', 81: 'Rain showers', 82: 'Heavy showers', 95: 'Thunderstorms' };
  return descriptions[code] || 'Weather';
}

async function readWeather(requirement) {
  const params = new URLSearchParams({
    latitude: String(WEATHER_LATITUDE),
    longitude: String(WEATHER_LONGITUDE),
    current: 'temperature_2m,weather_code,wind_speed_10m',
    daily: 'temperature_2m_max,temperature_2m_min',
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    timezone: 'auto',
    forecast_days: '1',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
  const data = await response.json();
  const temp = Math.round(data.current?.temperature_2m);
  const high = Math.round(data.daily?.temperature_2m_max?.[0]);
  const low = Math.round(data.daily?.temperature_2m_min?.[0]);
  const condition = weatherDescription(data.current?.weather_code);
  const hasTemps = Number.isFinite(temp) && Number.isFinite(high) && Number.isFinite(low);
  return connectedSection(requirement, hasTemps ? `${temp}° · ${condition}` : condition, [
    hasTemps ? `High ${high}° / Low ${low}°` : '',
    Number.isFinite(data.current?.wind_speed_10m) ? `Wind ${Math.round(data.current.wind_speed_10m)} mph` : '',
  ].filter(Boolean), { limit: 2 });
}

async function readShopping(requirement) {
  const client = await getSupabaseClient();
  const { data, error } = await client
    .schema(SHOPPING_SCHEMA)
    .from('items')
    .select('*')
    .eq('household_id', SHOPPING_HOUSEHOLD_ID)
    .eq('on_shopping_list', true)
    .order('created_at', { ascending: true })
    .limit(40);
  if (error) throw error;
  const activeItems = (data || []).filter((item) => item.removed !== true);
  const displayItems = activeItems.map((item) => item.item_name || '').filter(Boolean).slice(0, 18);
  if (!activeItems.length) return connectedSection(requirement, 'Shopping list is empty.', []);
  return connectedSection(requirement, `You have ${activeItems.length} item${activeItems.length === 1 ? '' : 's'} in your shopping list.`, displayItems, { limit: 18 });
}

export async function addShoppingItem(itemName) {
  const cleanName = String(itemName || '').trim();
  if (!cleanName) throw new Error('Enter an item first.');
  const client = await getSupabaseClient();
  const { error } = await client
    .schema(SHOPPING_SCHEMA)
    .from('items')
    .insert({
      household_id: SHOPPING_HOUSEHOLD_ID,
      item_name: cleanName,
      on_shopping_list: true,
      removed: false,
    });
  if (error) throw error;
  return { item_name: cleanName };
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.episodes)) return value.episodes;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.shows)) return value.shows;
  return [];
}

function getEpisodeDate(episode) {
  const raw = episode.air_date || episode.airDate || episode.date || episode.next_air_date || episode.airstamp || episode.first_aired;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEpisodeLabel(episode) {
  const show = episode.show || episode.show_name || episode.series || episode.series_name || episode.name || episode.title || 'TV episode';
  const title = episode.episode_title || episode.episode || episode.subtitle || '';
  const date = getEpisodeDate(episode);
  const day = date ? date.toLocaleDateString(undefined, { weekday: 'short' }) : '';
  return [day, show, title].filter(Boolean).join(' · ');
}

async function fetchTvFeed() {
  for (const url of TV_TRACKER_FEEDS) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) continue;
      const data = await response.json();
      const episodes = asArray(data);
      if (episodes.length) return episodes;
    } catch (error) {
      console.warn('TV Tracker feed unavailable:', url, error);
    }
  }
  return [];
}

async function readTvTracker(requirement) {
  const episodes = await fetchTvFeed();
  if (!episodes.length) return unavailableSection(requirement);
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const nextFive = new Date(start);
  nextFive.setDate(nextFive.getDate() + 5);
  const previousWeek = new Date(start);
  previousWeek.setDate(previousWeek.getDate() - 7);
  const withDates = episodes.map((episode) => ({ episode, date: getEpisodeDate(episode) })).filter((item) => item.date);
  const upcoming = withDates.filter((item) => item.date >= start && item.date <= nextFive).sort((a, b) => a.date - b.date);
  const recent = withDates.filter((item) => item.date >= previousWeek && item.date < start).sort((a, b) => b.date - a.date);
  const selected = [...upcoming, ...recent].slice(0, 6).map((item) => getEpisodeLabel(item.episode));
  if (!selected.length) return unavailableSection(requirement);
  return connectedSection(requirement, upcoming.length ? 'Upcoming episodes.' : 'Recent episodes.', selected, { limit: 6 });
}

async function readBuiltIn(requirement) {
  if (requirement.id === 'scheduler') return readScheduler(requirement);
  if (requirement.id === 'weather') return readWeather(requirement);
  if (requirement.id === 'shopping') return readShopping(requirement);
  if (requirement.id === 'tv') return readTvTracker(requirement);
  return unavailableSection(requirement);
}

async function readSection(requirement) {
  try {
    return await readBuiltIn(requirement);
  } catch (error) {
    console.warn(`Dashboard source unavailable: ${requirement.id}`, error);
    return unavailableSection(requirement);
  }
}

export async function getDashboardSnapshot() {
  const results = await Promise.all(REQUIREMENTS.map(readSection));
  const sections = results.filter((section) => section.state === 'connected');
  return {
    status: sections.length > 0 ? 'partial' : 'unavailable',
    generatedAt: new Date().toISOString(),
    sections,
    summary: { connected: sections.length, unavailable: 0, total: sections.length },
    missingConfig: [],
  };
}
