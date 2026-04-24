import { ref, watch } from "vue";

const STORAGE_KEY = 'multiglancer.appState.v2';

interface AppState {
  zoom: number;
  url: string;
  views: Array<{
    name: string;
    width: number;
    height: number;
    enabled: boolean;
    scale: number;
    reloadKey?: number;
  }>;
  leftPanelSize: number;
  leftPanelOpen: boolean;
  urlList: string[];
  urlIndex: number;
}

const defaultState: AppState = {
  zoom: 0.3,
  url: 'https://arcanepad.com',
  views: [
    { scale: 1, enabled: true, name: 'Pixel 5', width: 393, height: 851, reloadKey: 0 },
    { scale: 1, enabled: true, name: 'iPhone 12 Pro', width: 390, height: 844, reloadKey: 0 },
    { scale: 1, enabled: true, name: 'SXGA', width: 1280, height: 1024, reloadKey: 0 },
    { scale: 1, enabled: true, name: 'HD', width: 1366, height: 768, reloadKey: 0 },
    { scale: 1, enabled: true, name: 'HD+', width: 1600, height: 900, reloadKey: 0 },
    { scale: 1, enabled: true, name: 'FHD', width: 1920, height: 1080, reloadKey: 0 },
    { scale: 1, enabled: true, name: 'WUXGA', width: 1920, height: 1200, reloadKey: 0 },
    { scale: 1, enabled: true, name: 'QHD', width: 2560, height: 1440, reloadKey: 0 },
    { scale: 1, enabled: true, name: 'WQHD', width: 3440, height: 1440, reloadKey: 0 },
    { scale: 1, enabled: true, name: 'UHD', width: 3840, height: 2160, reloadKey: 0 },
  ],
  leftPanelSize: 22,
  leftPanelOpen: true,
  urlList: [],
  urlIndex: 0,
};

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return JSON.parse(JSON.stringify(defaultState));
    const parsed = JSON.parse(raw);
    return { ...JSON.parse(JSON.stringify(defaultState)), ...parsed };
  } catch {
    return JSON.parse(JSON.stringify(defaultState));
  }
}

export const appState = ref<AppState>(load());

watch(appState, (v) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch { /* ignore */ }
}, { deep: true });

// --- Export / Import ---------------------------------------------------

export function exportAppState(): string {
  return JSON.stringify(appState.value, null, 2);
}

const UPSTREAM_VIEW_KEYS = [
  'viewsiPhonesPortrait',
  'viewsiPadsPortrait',
  'viewsiPhonesLandscape',
  'viewsiPadsLandscape',
];

function stripQObjt(s: string): string {
  return s.startsWith('__q_objt|') ? s.slice('__q_objt|'.length) : s;
}

function isUpstreamShape(obj: unknown): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return UPSTREAM_VIEW_KEYS.some((k) => Array.isArray(o[k]));
}

function normalizeUpstream(upstream: Record<string, unknown>): Partial<AppState> {
  const out: Partial<AppState> = {};
  if (typeof upstream.zoom === 'number') out.zoom = upstream.zoom;
  if (typeof upstream.url === 'string') out.url = upstream.url;
  const views: AppState['views'] = [];
  for (const key of UPSTREAM_VIEW_KEYS) {
    const arr = upstream[key];
    if (!Array.isArray(arr)) continue;
    for (const v of arr) {
      if (!v || typeof v !== 'object') continue;
      const vv = v as Record<string, unknown>;
      views.push({
        name: String(vv.name ?? 'view'),
        width: Number(vv.width ?? 0),
        height: Number(vv.height ?? 0),
        enabled: Boolean(vv.enabled ?? true),
        scale: typeof vv.scale === 'number' ? vv.scale : 1,
        reloadKey: 0,
      });
    }
  }
  if (views.length) out.views = views;
  return out;
}

export function importAppState(input: string): void {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Empty input');

  let partial: Partial<AppState> | null = null;

  // Case A: raw localStorage dump: {"appState":"__q_objt|...", ...}
  if (trimmed.startsWith('{') && trimmed.includes('"appState"') && trimmed.includes('__q_objt|')) {
    const outer = JSON.parse(trimmed) as Record<string, unknown>;
    const inner = outer.appState;
    if (typeof inner !== 'string') throw new Error('appState field is not a string');
    const parsedInner = JSON.parse(stripQObjt(inner));
    if (isUpstreamShape(parsedInner)) {
      partial = normalizeUpstream(parsedInner as Record<string, unknown>);
    } else if (parsedInner && typeof parsedInner === 'object') {
      partial = parsedInner as Partial<AppState>;
    }
  }
  // Case B: single-field upstream value with prefix
  else if (trimmed.startsWith('__q_objt|')) {
    const parsed = JSON.parse(stripQObjt(trimmed));
    partial = isUpstreamShape(parsed)
      ? normalizeUpstream(parsed as Record<string, unknown>)
      : (parsed as Partial<AppState>);
  }
  // Case C: native JSON (or upstream-shaped JSON without prefix)
  else {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object') throw new Error('Not an object');
    partial = isUpstreamShape(parsed)
      ? normalizeUpstream(parsed as Record<string, unknown>)
      : (parsed as Partial<AppState>);
  }

  if (!partial) throw new Error('Could not parse config');

  // Shallow merge: only overwrite fields present in the imported object.
  appState.value = { ...appState.value, ...partial };
}
