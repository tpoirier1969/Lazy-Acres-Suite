const SUPABASE_URL = 'https://wntakzfoprthwggkidyq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_gWu_EQ1J3s0iNjeDeINJwQ_xKy8QgAJ';
const SHOPPING_SCHEMA = 'tod_donna_shared_shopping';
const SHOPPING_HOUSEHOLD_ID = 'tod-donna-shared';
const WEATHER_LATITUDE = 46.5435;
const WEATHER_LONGITUDE = -87.3954;

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

let supabaseScriptPromise = null;
let calendarClientPromise = null;
let shoppingClientPromise = null;

function getAdapterRegistry() {
  if (typeof window === 'undefined') return {};

  const registry = window.LAZY_ACRES_DASHBOARD_ADAPTERS;
  return registry && typeof registry === 'object' ? registry : {};
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
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

function connectedSection(requirement, message, items = []) {
  return {
    id: requirement.id,
    title: requirement.title,
    state: 'connected',
    message,
    items: normalizeItems(items),
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

async function getCalendarClient() {
  if (!calendarClientPromise) {
    calendarClientPromise = loadSupabaseScript().then((supabase) => supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY));
  }
  return calendarClientPromise;
}

async function getShoppingClient() {
  if (!shoppingClientPromise) {
    shoppingClientPromise = loadSupabaseScript().then(async (supabase) => {
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

  return shoppingClientPromise;
}

function formatEventTime(event) {
  if (event.is_all_day) return 'All day';
  const time = String(event.start_time || '').slice(0, 5);
  if (!time) return '';
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return time;
  const suffix = hours >= 12 ? 'pm' : 'am';
  const displayHour = ((hours + 11) % 12) + 1;
  return `${displayHour}:${String(minutes).padStart(2, '0')}${suffix}`;
}

function normalizeRepeatUnit(value) {
  const unit = String(value || '').toLowerCase();
  if (['day', 'week', 'month', 'year'].includes(unit)) return unit;
  const legacy = { daily: 'day', weekly: 'week', monthly: 'month', quarterly: 'month', yearly: 'year', annual: 'year' };
  return legacy[unit] || 'week';
}

function normalizeRepeatInterval(value, frequency) {
  const fallback = frequency === 'quarterly' ? 3 : 1;
  const numberValue = Math.floor(Number(value || fallback));
  return Number.isFinite(numberValue) && numberValue > 0 ? Math.min(numberValue, 99) : 1;
}

function startOfWeek(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const diff = (day + 6) % 7;
  next.setDate(next.getDate() - diff);
  return next;
}

function monthDiff(a, b) {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function recurringEventOccursOn(event, date) {
  const rule = event.recurrence_rule;
  if (!rule?.enabled) return false;

  const base = new Date(`${event.event_date}T00:00`);
  const target = new Date(`${todayIsoDateForDate(date)}T00:00`);
  if (target <= base) return false;
  if (rule.until && target > new Date(`${rule.until}T23:59:59`)) return false;

  const unit = normalizeRepeatUnit(rule.unit || rule.frequency);
  const interval = normalizeRepeatInterval(rule.interval, rule.frequency);

  if (unit === 'day') {
    const diffDays = Math.round((target - base) / 86400000);
    return diffDays > 0 && diffDays % interval === 0;
  }

  if (unit === 'week') {
    const days = Array.isArray(rule.days) && rule.days.length ? rule.days.map(Number) : [base.getDay()];
    if (!days.includes(target.getDay())) return false;
    const diffWeeks = Math.round((startOfWeek(target) - startOfWeek(base)) / (86400000 * 7));
    return diffWeeks > 0 && diffWeeks % interval === 0;
  }

  if (unit === 'month') {
    const diff = monthDiff(base, target);
    if (diff < 0 || diff % interval !== 0) return false;
    const anchorDay = Math.min(base.getDate(), daysInMonth(target.getFullYear(), target.getMonth()));
    return target.getDate() === anchorDay;
  }

  if (unit === 'year') {
    const diffYears = target.getFullYear() - base.getFullYear();
    if (diffYears <= 0 || diffYears % interval !== 0) return false;
    if (base.getMonth() === 1 && base.getDate() === 29) {
      const anchorDay = daysInMonth(target.getFullYear(), 1) === 29 ? 29 : 28;
      return target.getMonth() === 1 && target.getDate() === anchorDay;
    }
    return target.getMonth() === base.getMonth() && target.getDate() === base.getDate();
  }

  return false;
}

function todayIsoDateForDate(date) {
  return date.toISOString().slice(0, 10);
}

async function readSchedulerData(requirement) {
  const client = await getCalendarClient();
  const today = todayIsoDate();
  const { data, error } = await client
    .from('tod_donna_calendar_events')
    .select('*')
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(500);

  if (error) throw error;

  const todayDate = new Date(`${today}T00:00`);
  const events = (data || [])
    .filter((event) => event.status !== 'cancelled')
    .filter((event) => event.event_date === today || recurringEventOccursOn(event, todayDate))
    .sort((a, b) => String(a.start_time || '').localeCompare(String(b.start_time || '')));

  if (!events.length) return connectedSection(requirement, 'No calendar events today.', []);

  return connectedSection(
    requirement,
    `${events.length} calendar item${events.length === 1 ? '' : 's'} today.`,
    events.slice(0, 4).map((event) => ({
      time: formatEventTime(event),
      title: event.title || event.preset_name || 'Untitled event',
    })),
  );
}

function weatherDescription(code) {
  const descriptions = {
    0: 'Clear',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Cloudy',
    45: 'Fog',
    48: 'Rime fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Heavy drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    71: 'Light snow',
    73: 'Snow',
    75: 'Heavy snow',
    80: 'Rain showers',
    81: 'Rain showers',
    82: 'Heavy showers',
    95: 'Thunderstorms',
  };
  return descriptions[code] || 'Weather';
}

async function readWeatherData(requirement) {
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
  const condition = weatherDescription(data.current?.weather_code);
  const high = Math.round(data.daily?.temperature_2m_max?.[0]);
  const low = Math.round(data.daily?.temperature_2m_min?.[0]);

  const hasTemps = Number.isFinite(temp) && Number.isFinite(high) && Number.isFinite(low);
  return connectedSection(
    requirement,
    hasTemps ? `${temp}° · ${condition}` : condition,
    [
      hasTemps ? `High ${high}° / Low ${low}°` : '',
      Number.isFinite(data.current?.wind_speed_10m) ? `Wind ${Math.round(data.current.wind_speed_10m)} mph` : '',
    ].filter(Boolean),
  );
}

async function readShoppingData(requirement) {
  const client = await getShoppingClient();
  const { data, error } = await client
    .schema(SHOPPING_SCHEMA)
    .from('items')
    .select('item_name,name,category,store,on_shopping_list,removed,created_at')
    .eq('household_id', SHOPPING_HOUSEHOLD_ID)
    .eq('on_shopping_list', true)
    .eq('removed', false)
    .order('created_at', { ascending: true })
    .limit(12);

  if (error) throw error;

  const items = (data || [])
    .map((item) => item.item_name || item.name || '')
    .filter(Boolean)
    .slice(0, 4);

  if (!items.length) return connectedSection(requirement, 'Shopping list is empty.', []);

  return connectedSection(
    requirement,
    `${data.length} shopping item${data.length === 1 ? '' : 's'} active.`,
    items,
  );
}

async function readBuiltInSection(requirement) {
  if (requirement.id === 'scheduler') return readSchedulerData(requirement);
  if (requirement.id === 'weather') return readWeatherData(requirement);
  if (requirement.id === 'shopping') return readShoppingData(requirement);
  return unavailableSection(requirement);
}

async function readSection(requirement, adapters) {
  const adapter = adapters[requirement.id] || (requirement.id === 'recent' ? adapters['recent-activity'] : undefined);

  if (typeof adapter === 'function') {
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

  try {
    return await readBuiltInSection(requirement);
  } catch (error) {
    console.warn(`Dashboard source unavailable: ${requirement.id}`, error);
    return unavailableSection(requirement);
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
