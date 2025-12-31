'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as _ from 'lodash';
import * as jmespath from 'jmespath';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { startCase } from 'lodash';
import { firestoreService } from '@/app/graphql-playground/services/firestoreService';
import { extractDataFromResponse } from '@/app/graphql-playground/utils/data-extractor';
import { removeIndexKeys } from '@/app/graphql-playground/utils/data-flattener';
import { getInitialEndpoint, DEFAULT_AUTH_TOKEN } from '@/app/graphql-playground/constants';
import { MonthRangePicker } from './MonthRangePicker';

// Custom hook for localStorage with proper JSON serialization for string/null values
function useLocalStorageString(key, defaultValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      if (item === null || item === undefined) return defaultValue;
      const parsed = JSON.parse(item);
      return (typeof parsed === 'string' || parsed === null) ? parsed : defaultValue;
    } catch (error) {
      try {
        window.localStorage.removeItem(key);
      } catch { }
      return defaultValue;
    }
  });

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
      if (typeof newValue === 'string' || newValue === null) {
        const serialized = JSON.stringify(newValue);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, serialized);
        }
        setValue(newValue);
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [value, setStoredValue];
}

export default function DataProvider({ 
  offlineData, 
  onDataChange, 
  onError,
  onTableDataChange,
  renderHeaderControls,
  children 
}) {
  const [dataSource, setDataSource] = useLocalStorageString('datatable-dataSource', 'offline');
  const [selectedQueryKey, setSelectedQueryKey] = useLocalStorageString('datatable-selectedQueryKey', null);
  const [savedQueries, setSavedQueries] = useState([]);
  const [loadingQueries, setLoadingQueries] = useState(false);
  const [executingQuery, setExecutingQuery] = useState(false);
  const [responseData, setResponseData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [transformerCode, setTransformerCode] = useState('');
  const [monthRange, setMonthRange] = useState(null); // Array of [startMonth, endMonth] or null
  const [hasMonthSupport, setHasMonthSupport] = useState(false); // Whether the current query supports month filtering
  const [isRunningTransformer, setIsRunningTransformer] = useState(false);

  // Load saved queries on mount
  useEffect(() => {
    const loadSavedQueries = async () => {
      setLoadingQueries(true);
      try {
        const queries = await firestoreService.getAllQueries();
        setSavedQueries(queries);
      } catch (error) {
        console.error('Error loading saved queries:', error);
        if (onError) {
          onError({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load saved queries',
            life: 3000
          });
        }
      } finally {
        setLoadingQueries(false);
      }
    };
    loadSavedQueries();
  }, [onError]);

  // Execute query when data source changes to a saved query
  useEffect(() => {
    if (dataSource && dataSource !== 'offline') {
      executeSavedQuery(dataSource);
    } else if (dataSource === 'offline') {
      setResponseData(null);
      setProcessedData(null);
      setTransformerCode('');
      setSelectedQueryKey(null);
      setMonthRange(null);
      setHasMonthSupport(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSource]);

  // Get available query keys from processedData
  const availableQueryKeys = useMemo(() => {
    if (!processedData || dataSource === 'offline') return [];
    return Object.keys(processedData).filter(key => 
      processedData[key] && 
      processedData[key].length > 0
    );
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

  // Process data when responseData changes (basic processing - transformer handles transformation)
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
      // Use original data - flattening is now done in transformer code
      processed[queryKey] = data;
    }

    // Remove __index__ keys from all processed data at the end
    const cleanedProcessed = {};
    for (const [key, value] of Object.entries(processed)) {
      cleanedProcessed[key] = removeIndexKeys(value);
    }

    setProcessedData(cleanedProcessed);
  }, [responseData]);

  // Execute saved query
  const executeSavedQuery = useCallback(async (queryId, skipMonthDateLoad = false) => {
    setExecutingQuery(true);
    try {
      const queryDoc = await firestoreService.loadQuery(queryId);
      if (!queryDoc) {
        throw new Error('Query not found');
      }

      const { body, variables, index, transformerCode: savedTransformerCode, month, monthDate } = queryDoc;
      if (!body || !body.trim()) {
        throw new Error('Query body is empty');
      }

      // Set transformer code from saved document
      if (savedTransformerCode !== undefined) {
        setTransformerCode(savedTransformerCode || '');
      } else {
        setTransformerCode('');
      }

      // Set month support flag from saved document
      setHasMonthSupport(month === true);
      
      // Load initial month range from monthDate only on initial load (not when Apply is clicked)
      if (!skipMonthDateLoad) {
        if (month === true && monthDate) {
          try {
            // Parse monthDate (ISO format like "2025-10-31T18:30:00.000Z")
            const date = new Date(monthDate);
            if (!isNaN(date.getTime())) {
              // Get the year and month from the date
              const year = date.getFullYear();
              const monthIndex = date.getMonth();
              
              // Create dates for the first day of the month (start) and last day of the month (end)
              const startOfMonth = new Date(year, monthIndex, 1);
              const lastDay = new Date(year, monthIndex + 1, 0).getDate();
              const endOfMonth = new Date(year, monthIndex, lastDay);
              
              // Set month range to start and end of that month
              setMonthRange([startOfMonth, endOfMonth]);
            } else {
              // Invalid date, clear month range
              setMonthRange(null);
            }
          } catch (error) {
            console.error('Error parsing monthDate:', error);
            setMonthRange(null);
          }
        } else if (month !== true) {
          // Clear month range if query doesn't support month filtering
          setMonthRange(null);
        }
      }

      // Get endpoint URL and auth token
      const endpoint = getInitialEndpoint();
      const endpointUrl = endpoint?.code;
      const authToken = DEFAULT_AUTH_TOKEN;

      if (!endpointUrl) {
        throw new Error('GraphQL endpoint URL is not set');
      }

      // Parse variables if provided
      let parsedVariables = {};
      if (variables && variables.trim()) {
        try {
          parsedVariables = JSON.parse(variables);
        } catch (e) {
          // Failed to parse variables, using empty object
        }
      }

      // Update variables with startDate and endDate from month range if selected and query supports it
      if (hasMonthSupport && monthRange && Array.isArray(monthRange) && monthRange.length === 2) {
        const [startMonth, endMonth] = monthRange;
        
        if (startMonth && endMonth) {
          // Ensure startMonth is before or equal to endMonth
          const sorted = [startMonth, endMonth].sort((a, b) => a - b);
          const start = sorted[0];
          const end = sorted[1];

          // Calculate startDate: first day of the earliest month
          const startYear = start.getFullYear();
          const startMonthIndex = start.getMonth();
          const startDate = `${startYear}-${String(startMonthIndex + 1).padStart(2, '0')}-01`;

          // Calculate endDate: last day of the latest month
          const endYear = end.getFullYear();
          const endMonthIndex = end.getMonth();
          const lastDay = new Date(endYear, endMonthIndex + 1, 0).getDate();
          const endDate = `${endYear}-${String(endMonthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

          // Update or add startDate and endDate to variables
          parsedVariables.startDate = startDate;
          parsedVariables.endDate = endDate;
        }
      }

      // Execute GraphQL query
      const response = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': authToken }),
        },
        body: JSON.stringify({
          query: body,
          variables: parsedVariables,
        }),
      });

      const jsonResponse = await response.json();
      if (jsonResponse.errors) {
        throw new Error(JSON.stringify(jsonResponse.errors));
      }

      // Extract data using the abstracted utility function
      const extractedData = extractDataFromResponse(jsonResponse, body);
      setResponseData(extractedData);

      // Apply transformer if transformer code exists (will be applied via useEffect)
      // Reset the applied flag so transformer runs for new data
      transformerAppliedOnLoadRef.current = false;
      lastResponseDataRef.current = null;

      if (onDataChange) {
        onDataChange({
          severity: 'success',
          summary: 'Success',
          detail: 'Query executed successfully',
          life: 3000
        });
      }
    } catch (error) {
      console.error('Error executing query:', error);
      if (onError) {
        onError({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'Failed to execute query',
          life: 5000
        });
      }
      setResponseData(null);
      setProcessedData(null);
    } finally {
      setExecutingQuery(false);
    }
  }, [onDataChange, onError, hasMonthSupport, monthRange]);

  // Track if transformer has been applied on initial load for current responseData
  const transformerAppliedOnLoadRef = useRef(false);
  const lastResponseDataRef = useRef(null);

  // Create query function for transformer
  const createQueryFunction = useCallback(() => {
    return async (queryKey) => {
      if (!queryKey || !queryKey.trim()) {
        throw new Error('Query key is required');
      }

      // Load query document from Firestore
      const queryDoc = await firestoreService.loadQuery(queryKey);
      if (!queryDoc) {
        throw new Error(`Query "${queryKey}" not found`);
      }

      const { body, variables } = queryDoc;
      if (!body || !body.trim()) {
        throw new Error('Query body is empty');
      }

      // Get endpoint URL and auth token
      const endpoint = getInitialEndpoint()?.code;
      const token = DEFAULT_AUTH_TOKEN;

      if (!endpoint) {
        throw new Error('GraphQL endpoint URL is not set');
      }

      // Parse variables if provided
      let parsedVariables = {};
      if (variables && variables.trim()) {
        try {
          parsedVariables = JSON.parse(variables);
        } catch (e) {
          console.warn('Failed to parse variables, using empty object:', e);
        }
      }

      // Execute GraphQL query
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': token }),
        },
        body: JSON.stringify({
          query: body,
          variables: parsedVariables,
        }),
      });

      const jsonResponse = await response.json();
      if (jsonResponse.errors) {
        throw new Error(JSON.stringify(jsonResponse.errors));
      }

      // Extract data using the abstracted utility function
      const extractedData = extractDataFromResponse(jsonResponse, body);
      return extractedData;
    };
  }, []);

  // Apply transformer code and update processedData
  const applyTransformer = useCallback(async () => {
    if (isRunningTransformer) {
      return;
    }

    if (!transformerCode || transformerCode.trim() === '') {
      return;
    }

    if (!responseData) {
      return;
    }

    console.log('Applying transformer:', transformerCode);
    setIsRunningTransformer(true);

    try {
      // Create query function
      const query = createQueryFunction();

      // Wrap editor content in async function to support await
      const wrappedContent = `(async () => {
        ${transformerCode || ''}
      })()`;

      // Create function with imports and context
      const fn = new Function(
        'jmespath',
        '_',
        'data',
        'query',
        `return ${wrappedContent};`
      );

      // Execute with provided context
      // Always use responseData (original data) as source, not processedData
      const sourceData = responseData;
      const dataCopy = sourceData ? JSON.parse(JSON.stringify(sourceData)) : {};
      const evalResult = await fn(
        jmespath,
        _,
        dataCopy,
        query
      );

      console.log('Transformer Result:', evalResult);

      // If result is valid, use it to update processedData
      if (evalResult !== null && evalResult !== undefined) {
        // Ensure result is in the correct format (object with queryKeys)
        if (typeof evalResult === 'object' && !Array.isArray(evalResult)) {
          setProcessedData(evalResult);
        } else {
          console.warn('Transformer result is not an object, ignoring result');
        }
      }
    } catch (error) {
      console.error('Error applying transformer:', error);
      console.error('Error Type:', error.name);
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
    } finally {
      setIsRunningTransformer(false);
    }
  }, [transformerCode, isRunningTransformer, createQueryFunction, responseData, setProcessedData]);

  // Apply transformer whenever responseData changes (after GraphQL query execution)
  // This ensures transformer runs every time a query is executed
  useEffect(() => {
    // Only apply if:
    // 1. Transformer code exists
    // 2. We have responseData (original data)
    // 3. We haven't already applied for this specific responseData instance
    if (!transformerCode || transformerCode.trim() === '') {
      return;
    }

    if (!responseData) {
      return;
    }

    // Check if we've already applied for this responseData instance
    if (transformerAppliedOnLoadRef.current && lastResponseDataRef.current === responseData) {
      return;
    }

    // Apply transformer whenever new data arrives (after GraphQL query)
    transformerAppliedOnLoadRef.current = true;
    lastResponseDataRef.current = responseData;
    applyTransformer();
  }, [responseData, applyTransformer]); // Runs every time responseData changes (new query executed)

  // Determine which data to use (processed from query or offline)
  const tableData = useMemo(() => {
    if (dataSource !== 'offline' && processedData && selectedQueryKey) {
      return processedData[selectedQueryKey] || [];
    }
    return offlineData || [];
  }, [dataSource, processedData, selectedQueryKey, offlineData]);

  // Notify parent when table data changes
  useEffect(() => {
    if (onTableDataChange) {
      onTableDataChange(tableData);
    }
  }, [tableData, onTableDataChange]);

  // Render selectors JSX
  const selectorsJSX = (
    <>
      <div className="flex items-center gap-3">
        {/* Data Source Selector */}
        <div className="w-48">
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Data Source
          </label>
          <Dropdown
            value={dataSource}
            onChange={(e) => setDataSource(e.value)}
            options={[
              { label: 'Offline', value: 'offline' },
              ...savedQueries.map(q => ({ label: q.name, value: q.id }))
            ]}
            optionLabel="label"
            optionValue="value"
            placeholder="Select Data Source"
            className="w-full"
            loading={loadingQueries}
            disabled={executingQuery}
          />
        </div>

        {/* Query Key Selector - Only show when using saved query */}
        {dataSource !== 'offline' && availableQueryKeys.length > 0 && (
          <div className="w-48">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Query Key
            </label>
            <Dropdown
              value={selectedQueryKey}
              onChange={(e) => setSelectedQueryKey(e.value)}
              options={availableQueryKeys.map(key => ({ 
                label: startCase(key.split('__').join(' ').split('_').join(' ')), 
                value: key 
              }))}
              optionLabel="label"
              optionValue="value"
              placeholder="Select Query Key"
              className="w-full"
              disabled={executingQuery || !processedData}
            />
          </div>
        )}

        {/* Month Range Picker - Only show when using saved query that supports month filtering */}
        {dataSource !== 'offline' && hasMonthSupport && (
          <div className="flex items-end gap-2">
            <div className="w-64">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Month Range
              </label>
              <MonthRangePicker
                value={monthRange}
                onChange={setMonthRange}
                placeholder="Select month range"
                dateFormat="mm/yy"
                className="w-full"
                showIcon
                iconPos="left"
                disabled={executingQuery}
              />
            </div>
            <Button
              label="Apply"
              icon="pi pi-check"
              onClick={() => {
                if (dataSource && dataSource !== 'offline') {
                  // Skip loading from monthDate when Apply is clicked - use current monthRange
                  executeSavedQuery(dataSource, true);
                }
              }}
              disabled={executingQuery || !monthRange}
              className="p-button-sm"
              style={{ height: '2.5rem', marginBottom: '0.25rem' }}
              title="Apply month range filter"
            />
          </div>
        )}

        {executingQuery && (
          <div className="flex items-center text-sm text-gray-600">
            <i className="pi pi-spin pi-spinner mr-2"></i>
            Executing...
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Render header controls if render prop provided */}
      {renderHeaderControls && renderHeaderControls(selectorsJSX)}
      
      {/* Render children */}
      {children}
    </>
  );
}

