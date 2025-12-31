'use client';

import { useEffect, useMemo, useCallback, useRef, useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { TabView, TabPanel } from 'primereact/tabview';
import { Button } from 'primereact/button';
import { startCase } from 'lodash';
import * as _ from 'lodash';
import * as jmespath from 'jmespath';
import Editor from '@monaco-editor/react';
import { useGraphiQL } from '@graphiql/react';
import DataTableComponent from '@/components/DataTable';
import { useTableDialogStore } from '../stores/useTableDialogStore';
import { useAppStore } from '../stores/useAppStore';
import { removeIndexKeys } from '../utils/data-flattener';
import { extractDataFromResponse } from '../utils/data-extractor';
import { getInitialEndpoint, DEFAULT_AUTH_TOKEN } from '../constants';
import { firestoreService } from '../services/firestoreService';
import { extractOperationName } from '../utils/graphql-parser';

export function TableDialog({ visible, onHide, responseData }) {
  const { activeTab, setActiveTab, processedData, setProcessedData, reset } = useTableDialogStore();
  const { endpointUrl, authToken, tabData, setTabData } = useAppStore();
  const activeGraphiQLTabIndex = useGraphiQL((state) => state.activeTabIndex) ?? 0;
  const queryEditor = useGraphiQL((state) => state.queryEditor);
  const [isRunning, setIsRunning] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Get current tab's transformedData - use responseData prop (which is already transformedData for current tab)
  // Also get from store as fallback
  const currentTabData = useMemo(() => {
    // responseData prop is already the current tab's transformedData
    return responseData || null;
  }, [responseData]);

  // Get transformer code from current GraphiQL tab's data
  const currentTabInfo = useMemo(() => {
    return tabData[activeGraphiQLTabIndex] || { hasSuccessfulQuery: false, transformedData: null, transformerCode: '' };
  }, [tabData, activeGraphiQLTabIndex]);

  const transformerCode = currentTabInfo.transformerCode || '';

  // Set transformer code for current GraphiQL tab
  const setTransformerCode = useCallback((code) => {
    setTabData(activeGraphiQLTabIndex, { transformerCode: code || '' });
  }, [activeGraphiQLTabIndex, setTabData]);

  // Compute queryKeys early for use in hooks
  const queryKeys = useMemo(() => {
    if (!responseData) return [];
    return Object.keys(responseData).filter(key => responseData[key] && responseData[key].length > 0);
  }, [responseData]);

  // Process data when responseData changes
  useEffect(() => {
    if (!responseData) {
      setProcessedData(null);
      return;
    }

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
  }, [responseData, queryKeys, setProcessedData]);

  // Track if transformer has been applied on initial load for current responseData
  const transformerAppliedOnLoadRef = useRef(false);
  const lastResponseDataRef = useRef(null);

  // Reset selected field and transformer applied flag when dialog closes
  useEffect(() => {
    if (!visible) {
      reset();
      transformerAppliedOnLoadRef.current = false;
      lastResponseDataRef.current = null;
    }
  }, [visible, reset]);

  // Reset transformer applied flag when responseData changes (new query executed)
  useEffect(() => {
    if (responseData) {
      transformerAppliedOnLoadRef.current = false;
      lastResponseDataRef.current = null;
    }
  }, [responseData]);



  // Create query function similar to DataProvider
  // Accepts a key (query ID) to load from Firestore and execute
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
      const endpoint = endpointUrl || getInitialEndpoint()?.code;
      const token = authToken || DEFAULT_AUTH_TOKEN;

      if (!endpoint) {
        throw new Error('GraphQL endpoint URL is not set');
      }

      // Parse variables if provided
      let parsedVariables = {};
      if (variables && variables.trim()) {
        try {
          parsedVariables = JSON.parse(variables);
        } catch (e) {
          // Failed to parse variables, using empty object
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
  }, [endpointUrl, authToken]);

  // Apply transformer code and update processedData
  const applyTransformer = useCallback(async () => {
    if (isRunning) {
      return;
    }

    if (!transformerCode || transformerCode.trim() === '') {
      return;
    }

    if (!processedData && !responseData) {
      return;
    }

    console.log('Applying transformer:', transformerCode);
    setIsRunning(true);
    setHasError(false); // Clear error state when starting a new run

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
      // This ensures we can reapply the transformer without transforming already-transformed data
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
      setHasError(true); // Mark as error

      // Propagate syntax errors and other errors with full details
      const errorDetails = {
        name: error.name,
        message: error.message,
        stack: error.stack,
        fileName: error.fileName,
        lineNumber: error.lineNumber,
        columnNumber: error.columnNumber
      };

      console.error('═══════════════════════════════════════════════════');
      console.error('Error applying transformer');
      console.error('═══════════════════════════════════════════════════');
      console.error('Error Type:', error.name);
      console.error('Error Message:', error.message);
      console.error('Error Details:', errorDetails);
      console.error('Error Stack:', error.stack);

      // For syntax errors, provide additional context
      if (error instanceof SyntaxError) {
        console.error('───────────────────────────────────────────────────');
        console.error('Syntax Error - Invalid JavaScript code detected');
        console.error('───────────────────────────────────────────────────');

        // Try to extract line number from stack if available
        const stackMatch = error.stack?.match(/eval:(\d+):(\d+)/);
        if (stackMatch) {
          const lineNum = parseInt(stackMatch[1], 10);
          const colNum = parseInt(stackMatch[2], 10);
          console.error(`Error at line ${lineNum}, column ${colNum}`);

          // Show the problematic line if possible
          const lines = transformerCode.split('\n');
          if (lines[lineNum - 1]) {
            console.error(`Problematic line ${lineNum}:`, lines[lineNum - 1]);
            if (colNum > 0) {
              console.error(' '.repeat(colNum + `Problematic line ${lineNum}: `.length) + '^');
            }
          }
        }
      }

      console.error('Transformer Code:', transformerCode);
      console.error('═══════════════════════════════════════════════════');
    } finally {
      // Clean up state
      setIsRunning(false);
    }
  }, [transformerCode, isRunning, createQueryFunction, responseData, setProcessedData]);

  // Apply transformer on initial load when transformerCode is available and data is ready
  useEffect(() => {
    // Only apply if:
    // 1. Dialog is visible
    // 2. Transformer code exists
    // 3. We have responseData (original data)
    // 4. We haven't already applied this transformer code
    if (!visible || !transformerCode || transformerCode.trim() === '') {
      return;
    }

    if (!responseData) {
      return;
    }

    // Check if we've already applied for this responseData
    if (transformerAppliedOnLoadRef.current && lastResponseDataRef.current === responseData) {
      return;
    }

    // Apply transformer on initial load
    transformerAppliedOnLoadRef.current = true;
    lastResponseDataRef.current = responseData;
    applyTransformer();
  }, [visible, responseData, applyTransformer]); // Note: transformerCode NOT in dependencies - only apply on load, not on code change

  // Handle apply button click - always apply when button is clicked
  const handlePlayClick = useCallback(() => {
    applyTransformer();
  }, [applyTransformer]);

  // Cleanup on unmount or dialog close
  useEffect(() => {
    if (!visible) {
      setIsRunning(false);
      setHasError(false); // Clear error state when dialog closes
    }
  }, [visible]);



  // Early returns after all hooks
  if (!responseData) {
    return null;
  }

  if (queryKeys.length === 0) {
    return null;
  }

  return (
    <Dialog
      visible={visible}
      onHide={onHide}
      header={
        <div className="flex items-center gap-2">
          <i className="pi pi-table text-lg"></i>
          <span>GraphQL Response Data</span>
          {queryKeys.length > 1 && (
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({queryKeys.length} {queryKeys.length === 1 ? 'table' : 'tables'})
            </span>
          )}
        </div>
      }
      style={{ width: '90vw', height: '90vh' }}
      contentStyle={{
        paddingRight: '1rem',
        paddingLeft: '1rem',
        paddingTop: '0',
        paddingBottom: '0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '100%'
      }}
      headerStyle={{ padding: '0.5rem', borderBottom: '1px solid #e5e7eb' }}
      modal
      maximizable
      maximized
      dismissableMask
      breakpoints={{ '960px': '95vw', '640px': '98vw' }}
      className="table-dialog"
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'row', overflow: 'hidden', minHeight: 0, gap: '1rem' }}>
        {/* Left side: Table/TabView*/}
        <div style={{ flex: '0 0 70%', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
          {queryKeys.length > 1 ? (
            <TabView
              activeIndex={activeTab}
              onTabChange={(e) => {
                setActiveTab(e.index);
              }}
              className="flex-1 flex flex-col overflow-hidden"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}
            >
              {queryKeys.map((queryKey) => (
                <TabPanel key={queryKey} header={queryKey}>
                  <div className="h-full overflow-auto" style={{ height: '100%', overflow: 'auto', flex: 1, minHeight: 0, padding: '0.5rem' }}>
                    <DataTableComponent
                      data={processedData ? processedData[queryKey] : responseData[queryKey]}
                      enableFullscreenDialog={false}
                    />
                  </div>
                </TabPanel>
              ))}
            </TabView>
          ) : (
            <div className="h-full overflow-auto" style={{ height: '100%', overflow: 'auto', flex: 1, minHeight: 0, padding: '0.5rem' }}>
              <DataTableComponent
                data={processedData ? processedData[queryKeys[0]] : responseData[queryKeys[0]]}
                enableFullscreenDialog={false}
              />
            </div>
          )}
        </div>

        {/* Right side: Controls */}
        <div style={{ flex: '0 0 30%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid #e5e7eb', padding: '1rem', backgroundColor: '#f9fafb' }}>
          {/* Monaco Editor */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">
                Transformer Function:
              </label>
              <Button
                icon={isRunning ? "pi pi-spin pi-spinner" : "pi pi-play"}
                label={isRunning ? "Applying..." : "Apply"}
                className={
                  isRunning
                    ? "p-button-danger"
                    : hasError
                      ? "p-button-danger"
                      : "p-button-primary"
                }
                onClick={handlePlayClick}
                title={
                  isRunning
                    ? "Click to interrupt execution"
                    : hasError
                      ? "Previous execution had an error - Click to apply again"
                      : "Apply transformer function"
                }
                loading={isRunning}
                disabled={!transformerCode || transformerCode.trim() === ''}
                style={{
                  minWidth: '100px',
                  padding: '0.5rem 1rem',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              />
            </div>
            <div className="flex-1 border border-gray-300 rounded-lg overflow-hidden" style={{ minHeight: 0, height: '100%' }}>
              <Editor
                height="100%"
                language="javascript"
                value={transformerCode}
                onChange={(value) => setTransformerCode(value || '')}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 12,
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

