import { getDashboardSnapshot as getBaseDashboardSnapshot, addShoppingItem } from './dashboard-data-live.js?v=0.1.48';

export { addShoppingItem };

const TIMER_STORE_PREFIX = 'lazy-acres-timer-v1';
const SUITE_PROFILE_STORAGE_KEY = 'lazy-acres-suite-user-profile';
const TIMER_PROFILES = ['tod', 'donna', 'guest'];

function getPreferredProfiles() {
  const stored = localStorage.getItem(SUITE_PROFILE_STORAGE_KEY);
  const ordered = stored && TIMER_PROFILES.includes(stored)
    ? [stored, ...TIMER_PROFILES.filter((profile) => profile !== stored)]
    : TIMER_PROFILES;
  return ordered;
}

function readTimerData(profile) {
  try {
    const raw = localStorage.getItem(`${TIMER_STORE_PREFIX}:${profile}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch (error) {
    console.warn(`Timer project data could not be read for ${profile}.`, error);
    return null;
  }
}

function cleanStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function isOpenTimerProject(project, runningProjectIds) {
  if (!project || project.deleted || project.archived) return false;
  if (runningProjectIds.has(project.id)) return true;
  const status = cleanStatus(project.status || 'active');
  const closedStatuses = new Set(['closed', 'complete', 'completed', 'done', 'inactive', 'archived']);
  if (closedStatuses.has(status)) return false;
  return project.landing === true;
}

function getRunningProjectIds(data) {
  const ids = new Set();
  (Array.isArray(data?.sessions) ? data.sessions : []).forEach((session) => {
    if (!session || session.deleted || session.ended || !session.projectId) return;
    ids.add(session.projectId);
  });
  return ids;
}

function getProjectSortDate(project) {
  const raw = project?.lastWorked || project?.updated || project?.created || '';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function profileLabel(profile) {
  if (profile === 'tod') return 'Tod';
  if (profile === 'donna') return 'Donna';
  return 'Guest';
}

function formatTimerProjectItem(project, profile, runningProjectIds) {
  const parts = [project.name || 'Untitled project'];
  if (runningProjectIds.has(project.id)) parts.push('Running');
  if (project.typeName) parts.push(project.typeName);
  if (profile !== 'tod') parts.push(profileLabel(profile));
  return parts.filter(Boolean).join(' · ');
}

function readTimerDashboardSection() {
  if (typeof localStorage === 'undefined') return null;
  const projects = [];

  getPreferredProfiles().forEach((profile) => {
    const data = readTimerData(profile);
    if (!data) return;
    const runningProjectIds = getRunningProjectIds(data);
    (Array.isArray(data.projects) ? data.projects : [])
      .filter((project) => isOpenTimerProject(project, runningProjectIds))
      .forEach((project) => {
        projects.push({
          id: project.id,
          profile,
          sort: getProjectSortDate(project),
          text: formatTimerProjectItem(project, profile, runningProjectIds),
        });
      });
  });

  const unique = [];
  const seen = new Set();
  projects
    .sort((a, b) => b.sort - a.sort)
    .forEach((project) => {
      const key = `${project.profile}:${project.id}`;
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(project.text);
    });

  if (!unique.length) return null;

  return {
    id: 'timer',
    title: 'Open Timer Projects',
    state: 'connected',
    message: `${unique.length} project${unique.length === 1 ? '' : 's'} marked for the Lazy Acres landing page.`,
    items: unique.slice(0, 8),
    missing: '',
  };
}

export async function getDashboardSnapshot() {
  const snapshot = await getBaseDashboardSnapshot();
  const timerSection = readTimerDashboardSection();
  if (!timerSection) return snapshot;

  const existingSections = Array.isArray(snapshot?.sections) ? snapshot.sections : [];
  const sections = [timerSection, ...existingSections.filter((section) => section.id !== 'timer')];
  const previousSummary = snapshot?.summary || {};
  const previousTotal = Number(previousSummary.total || existingSections.length || 0);
  const previousConnected = Number(previousSummary.connected || existingSections.length || 0);
  const nextTotal = previousTotal + (existingSections.some((section) => section.id === 'timer') ? 0 : 1);
  const nextConnected = previousConnected + (existingSections.some((section) => section.id === 'timer') ? 0 : 1);
  const nextUnavailable = Math.max(0, nextTotal - nextConnected);

  return {
    ...snapshot,
    status: sections.length > 0 ? 'partial' : snapshot?.status,
    sections,
    summary: {
      ...previousSummary,
      connected: nextConnected,
      unavailable: nextUnavailable,
      total: nextTotal,
    },
    missingConfig: (snapshot?.missingConfig || []).filter((section) => section.id !== 'timer'),
  };
}
