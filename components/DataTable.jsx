'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Toast } from 'primereact/toast';
import { Dropdown } from 'primereact/dropdown';
import DataTableComponent from '../share/datatable/components/DataTable';
import DataTableControls from '../share/datatable/components/DataTableControls';
import data from '../resource/data';
import { uniq, flatMap, keys, isEmpty, startCase } from 'lodash';

// We'll import these dynamically or use them in a way that doesn't break SSR
let firestoreService;
let extractDataFromResponse;
let flattenParentItems;
let removeIndexKeys;
let getInitialEndpoint;
let DEFAULT_AUTH_TOKEN;

const loadGqlUtils = async () => {
  if (firestoreService) return;
  const firestoreModule = await import('../share/graphql-playground/services/firestoreService');
  firestoreService = firestoreModule.firestoreService;
  
  const extractorModule = await import('../share/graphql-playground/utils/data-extractor');
  extractDataFromResponse = extractorModule.extractDataFromResponse;
  
  const flattenerModule = await import('../share/graphql-playground/utils/data-flattener');
  flattenParentItems = flattenerModule.flattenParentItems;
  removeIndexKeys = flattenerModule.removeIndexKeys;
  
  const constantsModule = await import('../share/graphql-playground/constants');
  getInitialEndpoint = constantsModule.getInitialEndpoint;
  DEFAULT_AUTH_TOKEN = constantsModule.DEFAULT_AUTH_TOKEN;
};

// Fallback for missing target data
const Target = [];

// Custom hook for localStorage with proper JSON serialization for booleans
function useLocalStorageBoolean(key, defaultValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      if (item === null || item === undefined) return defaultValue;
      const parsed = JSON.parse(item);
      return typeof parsed === 'boolean' ? parsed : defaultValue;
    } catch (error) {
      try {
        window.localStorage.removeItem(key);
      } catch { }
      return defaultValue;
    }
  });

  // Sync with localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null && item !== undefined) {
        const parsed = JSON.parse(item);
        if (typeof parsed === 'boolean') {
          setValue(parsed);
        }
      }
    } catch (error) {
      // Ignore errors during sync
    }
  }, [key]);

  const setStoredValue = (newValue) => {
    try {
      if (typeof newValue === 'boolean') {
        const serialized = JSON.stringify(newValue);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, serialized);
        }
        setValue(newValue);
      } else {
        console.warn(`Attempted to set non-boolean value for "${key}":`, newValue);
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [value, setStoredValue];
}

// Custom hook for localStorage with proper JSON serialization for arrays
function useLocalStorageArray(key, defaultValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      if (item === null || item === undefined) return defaultValue;
      const parsed = JSON.parse(item);
      return Array.isArray(parsed) ? parsed : defaultValue;
    } catch (error) {
      // If parsing fails, try to clean up invalid data
      try {
        window.localStorage.removeItem(key);
      } catch { }
      return defaultValue;
    }
  });

  // Sync with localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null && item !== undefined) {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed)) {
          setValue(parsed);
        }
      }
    } catch (error) {
      // Ignore errors during sync
    }
  }, [key]);

  const setStoredValue = (newValue) => {
    try {
      if (Array.isArray(newValue)) {
        const serialized = JSON.stringify(newValue);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, serialized);
        }
        setValue(newValue);
      } else {
        console.warn(`Attempted to set non-array value for "${key}":`, newValue);
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [value, setStoredValue];
}

// Custom hook for localStorage with proper JSON serialization for string/null values
function useLocalStorageString(key, defaultValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      if (item === null || item === undefined) return defaultValue;
      const parsed = JSON.parse(item);
      // Accept string or null values
      return (typeof parsed === 'string' || parsed === null) ? parsed : defaultValue;
    } catch (error) {
      // If parsing fails, try to clean up invalid data
      try {
        window.localStorage.removeItem(key);
      } catch { }
      return defaultValue;
    }
  });

  // Sync with localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null && item !== undefined) {
        const parsed = JSON.parse(item);
        if (typeof parsed === 'string' || parsed === null) {
          setValue(parsed);
        }
      }
    } catch (error) {
      // Ignore errors during sync
    }
  }, [key]);

  const setStoredValue = (newValue) => {
    try {
      // Accept string or null values
      if (typeof newValue === 'string' || newValue === null) {
        const serialized = JSON.stringify(newValue);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, serialized);
        }
        setValue(newValue);
      } else {
        console.warn(`Attempted to set non-string/null value for "${key}":`, newValue);
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [value, setStoredValue];
}

// Custom hook for localStorage with proper JSON serialization for numbers
function useLocalStorageNumber(key, defaultValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      if (item === null || item === undefined) return defaultValue;
      const parsed = JSON.parse(item);
      // Accept number values
      return (typeof parsed === 'number' && !isNaN(parsed) && parsed > 0) ? parsed : defaultValue;
    } catch (error) {
      // If parsing fails, try to clean up invalid data
      try {
        window.localStorage.removeItem(key);
      } catch { }
      return defaultValue;
    }
  });

  // Sync with localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null && item !== undefined) {
        const parsed = JSON.parse(item);
        if (typeof parsed === 'number' && !isNaN(parsed) && parsed > 0) {
          setValue(parsed);
        }
      }
    } catch (error) {
      // Ignore errors during sync
    }
  }, [key]);

  const setStoredValue = (newValue) => {
    try {
      // Accept number values
      if (typeof newValue === 'number' && !isNaN(newValue) && newValue > 0) {
        const serialized = JSON.stringify(newValue);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, serialized);
        }
        setValue(newValue);
      } else {
        console.warn(`Attempted to set invalid number value for "${key}":`, newValue);
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [value, setStoredValue];
}

const DataTableWrapper = (props) => {
  const {
    className,
    showControls = true,
    enableSort: propEnableSort,
    enableFilter: propEnableFilter,
    enableSummation: propEnableSummation,
    enableCellEdit: propEnableCellEdit,
    rowsPerPageOptions: propRowsPerPageOptions,
    defaultRows: propDefaultRows,
    textFilterColumns: propTextFilterColumns,
    visibleColumns: propVisibleColumns,
    redFields: propRedFields,
    greenFields: propGreenFields,
    outerGroupField: propOuterGroupField,
    innerGroupField: propInnerGroupField,
    nonEditableColumns: propNonEditableColumns,
    enableTargetData: propEnableTargetData,
    targetOuterGroupField: propTargetOuterGroupField,
    targetInnerGroupField: propTargetInnerGroupField,
    targetValueField: propTargetValueField,
    actualValueField: propActualValueField,
    targetData: propTargetData,
    enableFullscreenDialog: propEnableFullscreenDialog,
    scrollable: propScrollable,
    scrollHeight: propScrollHeight,
  } = props;

  const toast = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useLocalStorageString('datatable-dataSource', 'offline');
  const [selectedQueryKey, setSelectedQueryKey] = useLocalStorageString('datatable-selectedQueryKey', null);
  const [savedQueries, setSavedQueries] = useState([]);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [executingQuery, setExecutingQuery] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [selectedFlattenField, setSelectedFlattenField] = useState(null);

  const [enableSortState, setEnableSort] = useLocalStorageBoolean('datatable-enableSort', true);
  const [enableFilterState, setEnableFilter] = useLocalStorageBoolean('datatable-enableFilter', true);
  const [enableSummationState, setEnableSummation] = useLocalStorageBoolean('datatable-enableSummation', true);
  const [enableCellEditState, setEnableCellEdit] = useLocalStorageBoolean('datatable-enableCellEdit', false);
  const [rowsPerPageOptionsRawState, setRowsPerPageOptionsRaw] = useLocalStorageArray('datatable-rowsPerPageOptions', [10, 25, 50, 100]);
  const [defaultRowsRawState, setDefaultRowsRaw] = useLocalStorageNumber('datatable-defaultRows', 10);
  const [textFilterColumnsRawState, setTextFilterColumnsRaw] = useLocalStorageArray('datatable-textFilterColumns', []);
  const [visibleColumnsRawState, setVisibleColumnsRaw] = useLocalStorageArray('datatable-visibleColumns', []);
  const [redFieldsRawState, setRedFieldsRaw] = useLocalStorageArray('datatable-redFields', []);
  const [greenFieldsRawState, setGreenFieldsRaw] = useLocalStorageArray('datatable-greenFields', []);
  const [outerGroupFieldRawState, setOuterGroupFieldRaw] = useLocalStorageString('datatable-outerGroupField', null);
  const [innerGroupFieldRawState, setInnerGroupFieldRaw] = useLocalStorageString('datatable-innerGroupField', null);
  const [nonEditableColumnsRawState, setNonEditableColumnsRaw] = useLocalStorageArray('datatable-nonEditableColumns', []);
  const [enableTargetDataRawState, setEnableTargetDataRaw] = useLocalStorageBoolean('datatable-enableTargetData', false);
  const [targetOuterGroupFieldRawState, setTargetOuterGroupFieldRaw] = useLocalStorageString('datatable-targetOuterGroupField', null);
  const [targetInnerGroupFieldRawState, setTargetInnerGroupFieldRaw] = useLocalStorageString('datatable-targetInnerGroupField', null);
  const [targetValueFieldRawState, setTargetValueFieldRaw] = useLocalStorageString('datatable-targetValueField', null);
  const [actualValueFieldRawState, setActualValueFieldRaw] = useLocalStorageString('datatable-actualValueField', null);
  const [enableFullscreenDialogState, setEnableFullscreenDialog] = useLocalStorageBoolean('datatable-enableFullscreenDialog', true);
  const [scrollableState, setScrollable] = useLocalStorageBoolean('datatable-scrollable', true);
  const [scrollHeightState, setScrollHeight] = useLocalStorageString('datatable-scrollHeight', '600px');

  // Derived values that prefer props over localStorage state
  const enableSort = propEnableSort !== undefined ? propEnableSort : enableSortState;
  const enableFilter = propEnableFilter !== undefined ? propEnableFilter : enableFilterState;
  const enableSummation = propEnableSummation !== undefined ? propEnableSummation : enableSummationState;
  const enableCellEdit = propEnableCellEdit !== undefined ? propEnableCellEdit : enableCellEditState;
  const rowsPerPageOptionsRaw = propRowsPerPageOptions !== undefined ? propRowsPerPageOptions : rowsPerPageOptionsRawState;
  const defaultRowsRaw = propDefaultRows !== undefined ? propDefaultRows : defaultRowsRawState;
  const textFilterColumnsRaw = propTextFilterColumns !== undefined ? propTextFilterColumns : textFilterColumnsRawState;
  const visibleColumnsRaw = propVisibleColumns !== undefined ? propVisibleColumns : visibleColumnsRawState;
  const redFieldsRaw = propRedFields !== undefined ? propRedFields : redFieldsRawState;
  const greenFieldsRaw = propGreenFields !== undefined ? propGreenFields : greenFieldsRawState;
  const outerGroupFieldRaw = propOuterGroupField !== undefined ? propOuterGroupField : outerGroupFieldRawState;
  const innerGroupFieldRaw = propInnerGroupField !== undefined ? propInnerGroupField : innerGroupFieldRawState;
  const nonEditableColumnsRaw = propNonEditableColumns !== undefined ? propNonEditableColumns : nonEditableColumnsRawState;
  const enableTargetDataRaw = propEnableTargetData !== undefined ? propEnableTargetData : enableTargetDataRawState;
  const targetOuterGroupFieldRaw = propTargetOuterGroupField !== undefined ? propTargetOuterGroupField : targetOuterGroupFieldRawState;
  const targetInnerGroupFieldRaw = propTargetInnerGroupField !== undefined ? propTargetInnerGroupField : targetInnerGroupFieldRawState;
  const targetValueFieldRaw = propTargetValueField !== undefined ? propTargetValueField : targetValueFieldRawState;
  const actualValueFieldRaw = propActualValueField !== undefined ? propActualValueField : actualValueFieldRawState;
  const targetData = propTargetData !== undefined ? propTargetData : Target;
  const enableFullscreenDialog = propEnableFullscreenDialog !== undefined ? propEnableFullscreenDialog : enableFullscreenDialogState;
  const scrollable = propScrollable !== undefined ? propScrollable : scrollableState;
  const scrollHeight = propScrollHeight !== undefined ? propScrollHeight : scrollHeightState;

  // Load saved queries on mount
  useEffect(() => {
    const loadSavedQueries = async () => {
      setLoadingQueries(true);
      try {
        await loadGqlUtils();
        const queries = await firestoreService.getAllQueries();
        setSavedQueries(queries);
      } catch (error) {
        console.error('Error loading saved queries:', error);
        toast.current?.show({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load saved queries',
          life: 3000
        });
      } finally {
        setLoadingQueries(false);
      }
    };
    loadSavedQueries();
  }, []);

  // Execute query when data source changes to a saved query
  useEffect(() => {
    if (dataSource && dataSource !== 'offline') {
      // Clear old data while fetching new one to show fallback/static data
      setResponseData(null);
      setProcessedData(null);
      executeSavedQuery(dataSource);
    } else if (dataSource === 'offline') {
      setResponseData(null);
      setProcessedData(null);
      setSelectedFlattenField(null);
      setSelectedQueryKey(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSource]);

  // Get available query keys from processedData
  const availableQueryKeys = useMemo(() => {
    if (!processedData || dataSource === 'offline') return [];
    return Object.keys(processedData).filter(key => processedData[key] !== undefined);
  }, [processedData, dataSource]);

  // Reset selectedQueryKey if it's not in available keys or if processedData changes
  useEffect(() => {
    if (dataSource !== 'offline' && processedData) {
      if (selectedQueryKey && !availableQueryKeys.includes(selectedQueryKey)) {
        if (availableQueryKeys.length > 0) {
          setSelectedQueryKey(availableQueryKeys[0]);
        } else {
          setSelectedQueryKey(null);
        }
      } else if (!selectedQueryKey && availableQueryKeys.length > 0) {
        setSelectedQueryKey(availableQueryKeys[0]);
      }
    }
  }, [processedData, availableQueryKeys, selectedQueryKey, dataSource, setSelectedQueryKey]);

  // Process data when responseData or selectedFlattenField changes
  useEffect(() => {
    if (!responseData) {
      setProcessedData(null);
      return;
    }

    const queryKeys = Object.keys(responseData).filter(key => responseData[key] && responseData[key].length > 0);
    if (queryKeys.length === 0) {
      setProcessedData(null);
      return;
    }

    const processed = {};
    for (const queryKey of queryKeys) {
      const data = responseData[queryKey];

      if (selectedFlattenField && data && data.length > 0) {
        processed[queryKey] = flattenParentItems(data, selectedFlattenField);
      } else {
        processed[queryKey] = data;
      }
    }

    const cleanedProcessed = {};
    for (const [key, value] of Object.entries(processed)) {
      cleanedProcessed[key] = removeIndexKeys(value);
    }

    setProcessedData(cleanedProcessed);
  }, [responseData, selectedFlattenField]);

  const flexibleExtractData = useCallback((jsonResponse, queryBody) => {
    // 1. Try the shared extractor first
    let data = null;
    try {
      data = extractDataFromResponse(jsonResponse, queryBody);
    } catch (e) {
      console.warn('Shared extractor failed:', e);
    }

    if (data && Object.keys(data).length > 0) {
      return data;
    }

    // 2. Fallback: Manually look for arrays in the response data
    if (!jsonResponse || !jsonResponse.data) return null;
    
    const gqlData = jsonResponse.data;
    const extracted = {};
    let hasAny = false;

    for (const [key, value] of Object.entries(gqlData)) {
      // Case 1: Direct array (e.g., { data: { SalesInvoices: [...] } })
      if (Array.isArray(value)) {
        extracted[key] = value;
        hasAny = true;
      } 
      // Case 2: Nested array (e.g., { data: { getInvoices: { items: [...] } } })
      else if (value && typeof value === 'object') {
        for (const [subKey, subValue] of Object.entries(value)) {
          if (Array.isArray(subValue)) {
            // Use a combined key name
            const combinedKey = subKey === 'items' || subKey === 'nodes' || subKey === 'data' 
              ? key 
              : `${key}__${subKey}`;
            
            // Avoid duplicates
            if (!extracted[combinedKey] || subValue.length > 0) {
              extracted[combinedKey] = subValue;
              hasAny = true;
            }
          }
        }
      }
    }

    return hasAny ? extracted : null;
  }, []);

  // Execute saved query
  const executeSavedQuery = useCallback(async (queryId) => {
    setExecutingQuery(true);
    try {
      await loadGqlUtils();
      const queryDoc = await firestoreService.loadQuery(queryId);
      if (!queryDoc) {
        throw new Error('Query not found in database');
      }

      const { body, variables, flattenField } = queryDoc;
      if (!body || !body.trim()) {
        throw new Error('Query body is empty');
      }

      if (flattenField) {
        setSelectedFlattenField(flattenField);
      } else {
        setSelectedFlattenField(null);
      }

      const endpoint = getInitialEndpoint();
      const endpointUrl = endpoint?.code;
      const endpointName = endpoint?.name; // 'UAT' or 'ERP'
      
      // Determine which token to use based on the endpoint name
      let authToken = process.env.NEXT_PUBLIC_GRAPHQL_AUTH_TOKEN;
      if (endpointName === 'UAT' && process.env.NEXT_PUBLIC_GRAPHQL_AUTH_TOKEN_UAT) {
        authToken = process.env.NEXT_PUBLIC_GRAPHQL_AUTH_TOKEN_UAT;
      } else if (endpointName === 'ERP' && process.env.NEXT_PUBLIC_GRAPHQL_AUTH_TOKEN_ERP) {
        authToken = process.env.NEXT_PUBLIC_GRAPHQL_AUTH_TOKEN_ERP;
      }

      console.log(`Executing Query on ${endpointName}:`, {
        endpoint: endpointUrl,
        hasToken: !!authToken,
        tokenPreview: authToken ? `${authToken.substring(0, 5)}...` : 'none'
      });

      if (!endpointUrl) {
        throw new Error(`GraphQL endpoint URL for ${endpointName} is not configured.`);
      }

      if (!authToken) {
        throw new Error(`No authentication token found for ${endpointName}. Please check your .env.local file.`);
      }

      let parsedVariables = {};
      if (variables && variables.trim()) {
        try {
          parsedVariables = JSON.parse(variables);
        } catch (e) {
          console.warn('Failed to parse variables:', e);
        }
      }

      // Format the Authorization header. 
      // Frappe sometimes uses "token key:secret" instead of "Bearer token"
      const authHeader = authToken.includes(':') && !authToken.toLowerCase().startsWith('token ')
        ? `token ${authToken}`
        : (authToken.toLowerCase().startsWith('bearer ') || authToken.toLowerCase().startsWith('token ') 
            ? authToken 
            : `Bearer ${authToken}`);

      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          query: body,
          variables: parsedVariables,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error (${response.status}): ${errorText.slice(0, 100)}`);
      }

      const jsonResponse = await response.json();
      console.log('GraphQL Response:', jsonResponse);

      if (jsonResponse.errors) {
        throw new Error(jsonResponse.errors[0]?.message || JSON.stringify(jsonResponse.errors));
      }

      const extractedData = flexibleExtractData(jsonResponse, body);
      
      if (!extractedData) {
        console.warn('Could not extract any data keys from response:', jsonResponse);
        toast.current?.show({
          severity: 'warn',
          summary: 'No Data Found',
          detail: 'The query executed but no displayable data keys were found in the response.',
          life: 5000
        });
      }

      setResponseData(extractedData);

      if (extractedData) {
        toast.current?.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Data fetched successfully',
          life: 3000
        });
      }
    } catch (error) {
      console.error('Error executing query:', error);
      toast.current?.show({
        severity: 'error',
        summary: 'Query Failed',
        detail: error.message || 'Failed to execute query',
        life: 5000
      });
      setResponseData(null);
      setProcessedData(null);
    } finally {
      setExecutingQuery(false);
    }
  }, [flexibleExtractData]);

  // Sync and Clean up localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const booleanKeys = [
          'datatable-enableSort', 
          'datatable-enableFilter', 
          'datatable-enableSummation', 
          'datatable-enableCellEdit',
          'datatable-enableFullscreenDialog',
          'datatable-scrollable'
        ];
        booleanKeys.forEach(key => {
          try {
            const item = window.localStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              if (typeof parsed !== 'boolean') window.localStorage.removeItem(key);
            }
          } catch { window.localStorage.removeItem(key); }
        });

        const arrayKeys = {
          'datatable-rowsPerPageOptions': { defaultValue: [10, 25, 50, 100], isColumnList: false },
          'datatable-textFilterColumns': { defaultValue: [], isColumnList: true },
          'datatable-visibleColumns': { defaultValue: [], isColumnList: true },
          'datatable-redFields': { defaultValue: [], isColumnList: true },
          'datatable-greenFields': { defaultValue: [], isColumnList: true },
          'datatable-nonEditableColumns': { defaultValue: [], isColumnList: true }
        };

        Object.entries(arrayKeys).forEach(([key, config]) => {
          try {
            const item = window.localStorage.getItem(key);
            if (item) {
              const parsed = JSON.parse(item);
              if (!Array.isArray(parsed)) {
                window.localStorage.removeItem(key);
                return;
              }
              if (key === 'datatable-rowsPerPageOptions') {
                const hasInvalidValues = parsed.some(v => typeof v !== 'number');
                if (hasInvalidValues) window.localStorage.removeItem(key);
              }
            }
          } catch { window.localStorage.removeItem(key); }
        });
      } catch (error) {
        console.warn('Error during localStorage cleanup:', error);
      }
      
      requestAnimationFrame(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const rowsPerPageOptions = useMemo(() => Array.isArray(rowsPerPageOptionsRaw) ? rowsPerPageOptionsRaw : [10, 25, 50, 100], [rowsPerPageOptionsRaw]);
  
  const defaultRows = useMemo(() => {
    if (typeof defaultRowsRaw !== 'number' || isNaN(defaultRowsRaw) || defaultRowsRaw <= 0) {
      return rowsPerPageOptions[0] || 10;
    }
    return rowsPerPageOptions.includes(defaultRowsRaw) ? defaultRowsRaw : rowsPerPageOptions[0] || 10;
  }, [defaultRowsRaw, rowsPerPageOptions]);

  useEffect(() => {
    if (Array.isArray(rowsPerPageOptions) && rowsPerPageOptions.length > 0) {
      if (!rowsPerPageOptions.includes(defaultRowsRaw)) {
        setDefaultRowsRaw(rowsPerPageOptions[0]);
      }
    }
  }, [rowsPerPageOptions, defaultRowsRaw, setDefaultRowsRaw]);

  // Determine table data
  const tableData = useMemo(() => {
    // 1. If we are in live query mode and have results, use those
    if (dataSource !== 'offline' && processedData && selectedQueryKey) {
      return processedData[selectedQueryKey] || [];
    }
    
    // 2. If we are in query mode but still loading, show empty to avoid flickering
    if (dataSource !== 'offline' && executingQuery) {
      return [];
    }

    // 3. Fallback to Offline mode data (Plasmic prop data)
    return props.data || data || [];
  }, [dataSource, processedData, selectedQueryKey, props.data, executingQuery]);

  // Extract columns
  const columns = useMemo(() => {
    if (!Array.isArray(tableData) || isEmpty(tableData)) return [];
    return uniq(flatMap(tableData, (item) => item && typeof item === 'object' ? keys(item) : []));
  }, [tableData]);

  const targetColumns = useMemo(() => {
    const dataToUse = (propTargetData && propTargetData.length > 0) ? propTargetData : Target;
    if (!Array.isArray(dataToUse) || isEmpty(dataToUse)) return [];
    return uniq(flatMap(dataToUse, (item) => item && typeof item === 'object' ? keys(item) : []));
  }, [propTargetData]);

  const handleCellEditComplete = (e) => {
    const { rowData, newValue, field, oldValue } = e;
    const columnName = startCase(field.split('__').join(' ').split('_').join(' '));
    toast.current?.show({
      severity: 'success',
      summary: 'Cell Updated',
      detail: `Column: ${columnName} | Previous: ${oldValue} → Current: ${newValue}`,
      life: 5000
    });
  };

  const handleOuterGroupClick = (rowData, column, value) => {
    const columnName = startCase(column.split('__').join(' ').split('_').join(' '));
    toast.current?.show({ severity: 'info', summary: 'Outer Group Clicked', detail: `Column: ${columnName} | Value: ${value}`, life: 5000 });
  };

  const handleInnerGroupClick = (rowData, column, value) => {
    const columnName = startCase(column.split('__').join(' ').split('_').join(' '));
    toast.current?.show({ severity: 'info', summary: 'Inner Group Clicked', detail: `Column: ${columnName} | Value: ${value}`, life: 5000 });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
          <p className="text-sm text-gray-600">Loading your preferences...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <Toast ref={toast} />
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        {showControls && (
          <>
            <div className="mb-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900">Data Table</h2>
                <p className="text-sm text-gray-500">View, filter, sort, and analyze your data with advanced table controls</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Data Source</label>
                  <Dropdown
                    value={dataSource}
                    onChange={(e) => setDataSource(e.value)}
                    options={[{ label: 'Offline', value: 'offline' }, ...savedQueries.map(q => ({ label: q.name, value: q.id }))]}
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Select Data Source"
                    className="w-full"
                    loading={loadingQueries}
                    disabled={executingQuery}
                  />
                </div>

                {dataSource !== 'offline' && (
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Query Key</label>
                    <Dropdown
                      value={selectedQueryKey}
                      onChange={(e) => setSelectedQueryKey(e.value)}
                      options={availableQueryKeys.map(key => ({ label: startCase(key.split('__').join(' ').split('_').join(' ')), value: key }))}
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Select Query Key"
                      className="w-full"
                      disabled={executingQuery || !processedData}
                      loading={executingQuery && availableQueryKeys.length === 0}
                    />
                  </div>
                )}
              </div>
              {executingQuery && <div className="mt-2 text-sm text-gray-600"><i className="pi pi-spin pi-spinner mr-2"></i>Executing query...</div>}
            </div>

            <DataTableControls
              enableSort={enableSort}
              enableFilter={enableFilter}
              enableSummation={enableSummation}
              enableCellEdit={enableCellEdit}
              rowsPerPageOptions={rowsPerPageOptions}
              defaultRows={defaultRows}
              columns={columns}
              textFilterColumns={textFilterColumnsRaw}
              visibleColumns={visibleColumnsRaw}
              redFields={redFieldsRaw}
              greenFields={greenFieldsRaw}
              outerGroupField={outerGroupFieldRaw}
              innerGroupField={innerGroupFieldRaw}
              nonEditableColumns={nonEditableColumnsRaw}
              enableTargetData={enableTargetDataRaw}
              targetColumns={targetColumns}
              targetOuterGroupField={targetOuterGroupFieldRaw}
              targetInnerGroupField={targetInnerGroupFieldRaw}
              targetValueField={targetValueFieldRaw}
              actualValueField={actualValueFieldRaw}
              onSortChange={setEnableSort}
              onFilterChange={setEnableFilter}
              onSummationChange={setEnableSummation}
              onCellEditChange={setEnableCellEdit}
              onRowsPerPageOptionsChange={setRowsPerPageOptionsRaw}
              onDefaultRowsChange={setDefaultRowsRaw}
              onTextFilterColumnsChange={setTextFilterColumnsRaw}
              onVisibleColumnsChange={setVisibleColumnsRaw}
              onRedFieldsChange={setRedFieldsRaw}
              onGreenFieldsChange={setGreenFieldsRaw}
              onOuterGroupFieldChange={setOuterGroupFieldRaw}
              onInnerGroupFieldChange={setInnerGroupFieldRaw}
              onNonEditableColumnsChange={setNonEditableColumnsRaw}
              onEnableTargetDataChange={setEnableTargetDataRaw}
              onTargetOuterGroupFieldChange={setTargetOuterGroupFieldRaw}
              onTargetInnerGroupFieldChange={setTargetInnerGroupFieldRaw}
              onTargetValueFieldChange={setTargetValueFieldRaw}
              onActualValueFieldChange={setActualValueFieldRaw}
            />

            {/* Display Settings - Local to wrapper to avoid modifying share folder */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-4 text-blue-700">
                <i className="pi pi-desktop text-lg"></i>
                <h3 className="font-bold">Display Settings</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2">
                    <i className={`pi pi-window-maximize ${enableFullscreenDialog ? 'text-blue-600' : 'text-gray-400'}`}></i>
                    <span className="text-sm font-medium text-gray-700">Fullscreen Dialog</span>
                  </div>
                  <div 
                    className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${enableFullscreenDialog ? 'bg-blue-600' : 'bg-gray-300'}`}
                    onClick={() => setEnableFullscreenDialog(!enableFullscreenDialog)}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${enableFullscreenDialog ? 'left-5.5 translate-x-1' : 'left-0.5'}`}></div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                  <div className="flex items-center gap-2">
                    <i className={`pi pi-arrows-v ${scrollable ? 'text-blue-600' : 'text-gray-400'}`}></i>
                    <span className="text-sm font-medium text-gray-700">Scrollable</span>
                  </div>
                  <div 
                    className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${scrollable ? 'bg-blue-600' : 'bg-gray-300'}`}
                    onClick={() => setScrollable(!scrollable)}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${scrollable ? 'left-5.5 translate-x-1' : 'left-0.5'}`}></div>
                  </div>
                </div>

                <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <i className="pi pi-expand text-gray-400"></i>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Scroll Height</span>
                  </div>
                  <input
                    type="text"
                    value={scrollHeight || ''}
                    onChange={(e) => setScrollHeight(e.target.value)}
                    placeholder="e.g. 600px"
                    className="w-full text-sm font-medium text-gray-900 border-0 p-0 focus:ring-0 placeholder:text-gray-300"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        <DataTableComponent
          data={tableData}
          rowsPerPageOptions={rowsPerPageOptions}
          defaultRows={defaultRows}
          scrollable={scrollable}
          scrollHeight={scrollHeight}
          enableSort={enableSort}
          enableFilter={enableFilter}
          enableSummation={enableSummation}
          textFilterColumns={textFilterColumnsRaw}
          visibleColumns={visibleColumnsRaw}
          onVisibleColumnsChange={showControls ? setVisibleColumnsRaw : null}
          redFields={redFieldsRaw}
          greenFields={greenFieldsRaw}
          outerGroupField={outerGroupFieldRaw}
          innerGroupField={innerGroupFieldRaw}
          enableCellEdit={enableCellEdit}
          nonEditableColumns={nonEditableColumnsRaw}
          onCellEditComplete={handleCellEditComplete}
          onOuterGroupClick={handleOuterGroupClick}
          onInnerGroupClick={handleInnerGroupClick}
          targetData={enableTargetDataRaw ? targetData : null}
          targetOuterGroupField={enableTargetDataRaw ? targetOuterGroupFieldRaw : null}
          targetInnerGroupField={enableTargetDataRaw ? targetInnerGroupFieldRaw : null}
          targetValueField={enableTargetDataRaw ? targetValueFieldRaw : null}
          actualValueField={enableTargetDataRaw ? actualValueFieldRaw : null}
          enableFullscreenDialog={enableFullscreenDialog}
        />
      </div>
    </div>
  );
};

export default DataTableWrapper;
