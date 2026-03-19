/**
 * Config service - unified async API for listing and loading DataTable configs.
 * Aggregates local provider (now) and can add Firebase provider (future).
 * Callers use listConfigs() and getConfig(id) - source-agnostic.
 */

import { isEqual } from 'lodash';
import { listLocalConfigs, getLocalConfig } from './providers/localConfigProvider';
import { defaultConfigId } from './configRegistry';
import { deserializeJsToConfig } from './configSerializer';
import { firestoreService } from '@/app/graphql-playground/services/firestoreService';
// Future: import { listFirebaseConfigs, getFirebaseConfig } from './providers/firebaseConfigProvider';

/**
 * List all available configs (sync - from registry)
 * @returns {Array<{ id: string, displayName: string, source: string }>}
 */
export function getConfigList() {
  return listLocalConfigs();
}

/**
 * List all available configs from all providers (async for future Firebase)
 * @returns {Promise<Array<{ id: string, displayName: string, source: string }>>}
 */
export async function listConfigs() {
  const local = listLocalConfigs();
  // const remote = await listFirebaseConfigs?.() ?? [];
  // return [...local, ...remote].sort((a, b) => a.displayName.localeCompare(b.displayName));
  return local;
}

/**
 * Get config object by id (tries local first, then remote when Firebase is added)
 * @param {string} id - Config id (e.g. 'defaultConfig')
 * @returns {Promise<Object|null>} - The config object or null
 */
export async function getConfig(id) {
  const local = getLocalConfig(id);
  if (local) return local;
  // return await getFirebaseConfig?.(id) ?? null;
  return null;
}

/**
 * Get the config id that is selected by default (from registry).
 * @returns {string}
 */
export function getDefaultConfigId() {
  return defaultConfigId;
}

/**
 * Get default config synchronously (for initial state, default props).
 * Uses defaultConfigId from registry - change it to switch which config loads on page init.
 * @returns {Object|null} - The default config object or null
 */
export function getDefaultConfig() {
  return getLocalConfig(defaultConfigId);
}

/**
 * Merge user config with base config
 * @param {Object} userConfig - User-provided configuration
 * @param {Object} [baseConfig] - Base config (defaults to getDefaultConfig())
 * @returns {Object} Merged configuration
 */
export function mergeConfig(userConfig = {}, baseConfig = getDefaultConfig()) {
  const base = baseConfig ?? {};
  return {
    ...base,
    ...userConfig,
    columnTypesOverride: {
      ...(base.columnTypesOverride || {}),
      ...(userConfig.columnTypesOverride || {}),
    },
    formInputOverride: {
      main: {
        ...(base.formInputOverride?.main || {}),
        ...(userConfig.formInputOverride?.main || {}),
      },
      nested: (() => {
        const defaultNested = base.formInputOverride?.nested || {};
        const userNested = userConfig.formInputOverride?.nested || {};
        const tableNames = new Set([...Object.keys(defaultNested), ...Object.keys(userNested)]);
        const merged = {};
        for (const tableName of tableNames) {
          merged[tableName] = {
            ...(defaultNested[tableName] || {}),
            ...(userNested[tableName] || {}),
          };
        }
        return merged;
      })(),
      object: (() => {
        const defaultObject = base.formInputOverride?.object || {};
        const userObject = userConfig.formInputOverride?.object || {};
        const objectColumns = new Set([...Object.keys(defaultObject), ...Object.keys(userObject)]);
        const merged = {};
        for (const columnName of objectColumns) {
          merged[columnName] = {
            ...(defaultObject[columnName] || {}),
            ...(userObject[columnName] || {}),
          };
        }
        return merged;
      })(),
    },
    drawerTabs: userConfig.drawerTabs || base.drawerTabs,
    slots: userConfig.slots || base.slots,
    percentageColumns: userConfig.percentageColumns ?? base.percentageColumns,
    derivedColumns: userConfig.derivedColumns ?? base.derivedColumns,
    derivedRows: userConfig.derivedRows ?? base.derivedRows ?? null,
    rowColumnStyles: userConfig.rowColumnStyles ?? base.rowColumnStyles,
    // allowedColumns: array = use as-is; object = deep-merge group key
    allowedColumns: (() => {
      const baseAC = base.allowedColumns;
      const userAC = userConfig.allowedColumns;
      if (Array.isArray(userAC)) return userAC;
      if (Array.isArray(baseAC) && !userAC) return baseAC;
      if (userAC && typeof userAC === 'object' && !Array.isArray(userAC)) {
        const merged = { ...(baseAC && typeof baseAC === 'object' && !Array.isArray(baseAC) ? baseAC : {}), ...userAC };
        if (merged.group && (baseAC?.group || userAC.group)) {
          merged.group = { ...(baseAC?.group || {}), ...(userAC.group || {}) };
        }
        if (merged.reportGroup || baseAC?.reportGroup || userAC?.reportGroup) {
          merged.reportGroup = { ...(baseAC?.reportGroup || {}), ...(userAC?.reportGroup || {}) };
        }
        return merged;
      }
      return userAC ?? baseAC;
    })(),
  };
}

/**
 * Resolve a config prop to a full config object.
 * Accepts a string (preset name looked up from local registry) or an object (used directly).
 * Does NOT merge with defaultConfig (which is a debug/dev config).
 * Safe defaults are applied later by extractStateFromConfig.
 * @param {string|Object} configProp - Preset name string or config object
 * @returns {Object} Resolved config object
 */
export function resolveConfig(configProp) {
  if (!configProp) return {};
  if (typeof configProp === 'string') {
    const local = getLocalConfig(configProp);
    if (local) return local;
    return {};
  }
  if (typeof configProp === 'object') {
    return configProp;
  }
  return {};
}

/**
 * Fetch and resolve a Firebase preset by name.
 * @param {string} dataSource - Query document ID (used as Firestore doc key)
 * @param {string} presetName - Preset name
 * @returns {Promise<Object|null>} Resolved config object or null if not found
 */
export async function resolveFirebaseConfig(dataSource, presetName) {
  if (!dataSource || !presetName) return null;
  const presets = await firestoreService.loadPresetsForQuery(dataSource);
  const preset = presets?.find((p) => p?.name === presetName);
  if (!preset?.config) return null;
  try {
    return deserializeJsToConfig(preset.config);
  } catch {
    return null;
  }
}

/**
 * Extract state values from config (for applying to React state).
 * Each field has a hardcoded safe default as the final fallback so callers
 * never receive undefined for fields the component code calls methods on.
 * @param {Object} config - Configuration object
 * @param {Object} [baseConfig] - Optional base config for fallbacks (defaults to empty -- NOT the debug/dev defaultConfig)
 * @returns {Object} Object with state values extracted from config
 */
export function extractStateFromConfig(config, baseConfig = {}) {
  const base = baseConfig ?? {};
  return {
    enableSort: config.enableSort ?? base.enableSort ?? true,
    enableFilter: config.enableFilter ?? base.enableFilter ?? true,
    enableSummation: config.enableSummation ?? base.enableSummation ?? false,
    enableGrouping: config.enableGrouping ?? base.enableGrouping ?? false,
    enableCellEdit: config.enableCellEdit ?? base.enableCellEdit ?? false,
    enableDivideBy1Lakh: config.enableDivideBy1Lakh ?? base.enableDivideBy1Lakh ?? false,
    rowsPerPageOptions: config.rowsPerPageOptions ?? base.rowsPerPageOptions ?? [10, 25, 50, 100],
    defaultRows: config.defaultRows ?? base.defaultRows ?? 10,
    tableHeight: config.tableHeight ?? base.tableHeight,
    scrollable: config.scrollable ?? base.scrollable ?? true,
    enableFullscreenDialog: config.enableFullscreenDialog ?? base.enableFullscreenDialog ?? true,
    textFilterColumns: config.textFilterColumns ?? base.textFilterColumns ?? [],
    allowedColumns: config.allowedColumns ?? base.allowedColumns ?? [],
    nonEditableColumns: config.nonEditableColumns ?? base.nonEditableColumns ?? [],
    editableColumns: config.editableColumns ?? base.editableColumns ?? { main: [], nested: {}, object: {} },
    percentageColumns: config.percentageColumns ?? base.percentageColumns ?? [],
    derivedColumns: config.derivedColumns ?? base.derivedColumns ?? [],
    derivedRows: config.derivedRows ?? base.derivedRows ?? null,
    redFields: config.redFields ?? base.redFields ?? [],
    greenFields: config.greenFields ?? base.greenFields ?? [],
    rowColumnStyles: config.rowColumnStyles ?? base.rowColumnStyles ?? [],
    groupFields: config.groupFields ?? base.groupFields ?? [],
    columnTypesOverride: config.columnTypesOverride ?? base.columnTypesOverride ?? {},
    formInputOverride: config.formInputOverride ?? base.formInputOverride ?? {},
    drawerTabs: config.drawerTabs ?? base.drawerTabs ?? [],
    enableReport: config.enableReport ?? base.enableReport ?? false,
    showChart: config.showChart ?? base.showChart ?? false,
    breakdownType: config.breakdownType ?? base.breakdownType ?? 'month',
    dateColumn: config.dateColumn ?? base.dateColumn ?? null,
    columnGroupBy: config.columnGroupBy ?? base.columnGroupBy ?? 'values',
    columnsExemptFromBreakdown: config.columnsExemptFromBreakdown ?? base.columnsExemptFromBreakdown ?? [],
    chartColumns: config.chartColumns ?? base.chartColumns ?? [],
    chartHeight: config.chartHeight ?? base.chartHeight ?? 400,
    isAdminMode: config.isAdminMode ?? base.isAdminMode ?? false,
    salesTeamColumn: config.salesTeamColumn ?? base.salesTeamColumn ?? null,
    salesTeamValues: config.salesTeamValues ?? base.salesTeamValues ?? [],
    hqColumn: config.hqColumn ?? base.hqColumn ?? null,
    hqValues: config.hqValues ?? base.hqValues ?? [],
    dataSource: config.dataSource ?? base.dataSource ?? null,
    selectedQueryKey: config.selectedQueryKey ?? base.selectedQueryKey ?? null,
    variableOverrides: config.variableOverrides ?? base.variableOverrides ?? {},
    slots: 'slots' in config ? config.slots : undefined,
  };
}

/**
 * Check if config is dirty: in-memory preset (parsed from JS) differs from applied config.
 * Config-level check - compares config objects only.
 * @param {string} presetJsValue - Serialized config (JS string from editor or preset)
 * @param {Object|null} appliedConfig - The config object currently applied
 * @returns {boolean} True if dirty (preset differs from applied, or parse error)
 */
export function isConfigDirty(presetJsValue, appliedConfig) {
  const hasPreset = !!(presetJsValue && presetJsValue.trim());
  if (!hasPreset) {
    return false;
  }
  try {
    const parsed = deserializeJsToConfig(presetJsValue);
    const applied = appliedConfig ?? {};
    const equal = isEqual(parsed, applied);
    const dirty = !equal;
    return dirty;
  } catch (err) {
    return true; // Invalid parse = treat as dirty (user has edits)
  }
}
