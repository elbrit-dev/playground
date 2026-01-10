'use client';

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import DataProvider from '../share/datatable/components/DataProvider';
import data from '../resource/data';

const TableDataProvider = (props) => {
  const {
    children,
    dataSource,
    queryKey,
    onDataChange,
    onTableDataChange,
    onVariablesChange,
    onDataSourceChange,
    variableOverrides,
    showSelectors = true,
    hideControls = false, // New prop to control selector visibility
    ...otherProps // Collect all other individual props to use as variables
  } = props;

  const lastExecutingRef = useRef(false);

  // Stable callback wrappers to prevent infinite loops in the shared DataProvider
  const onTableDataChangeRef = useRef(onTableDataChange);
  const onDataChangeRef = useRef(onDataChange);
  const onVariablesChangeRef = useRef(onVariablesChange);
  const onDataSourceChangeRef = useRef(onDataSourceChange);

  useEffect(() => { onTableDataChangeRef.current = onTableDataChange; }, [onTableDataChange]);
  useEffect(() => { onDataChangeRef.current = onDataChange; }, [onDataChange]);
  useEffect(() => { onVariablesChangeRef.current = onVariablesChange; }, [onVariablesChange]);
  useEffect(() => { onDataSourceChangeRef.current = onDataSourceChange; }, [onDataSourceChange]);

  const stableOnTableDataChange = useCallback((data) => {
    onTableDataChangeRef.current?.(data);
  }, []);

  const stableOnDataChange = useCallback((notif) => {
    // Forward the notification from DataProvider
    onDataChangeRef.current?.(notif);
  }, []);

  // Stable header control renderer that can filter UI elements
  const stableRenderHeaderControls = useCallback((selectorsJSX) => {
    // Detect execution status from the loading indicator presence in selectorsJSX
    // selectorsJSX is a Fragment containing a div. That div has two children: 
    // [0] is the controls div, [1] is the loading indicator (or false)
    const rootDiv = selectorsJSX?.props?.children;
    const childrenArr = rootDiv?.props?.children;
    const isCurrentlyExecuting = !!(Array.isArray(childrenArr) && childrenArr[1]);
    
    if (isCurrentlyExecuting !== lastExecutingRef.current) {
      lastExecutingRef.current = isCurrentlyExecuting;
      // Trigger execution notification for background/toast when it starts
      if (isCurrentlyExecuting) {
        setTimeout(() => {
          onDataChangeRef.current?.({
            severity: 'info',
            summary: 'Executing',
            detail: 'Processing request...',
            life: 3000
          });
        }, 0);
      }
    }

    if (!showSelectors) return null;

    if (!hideControls) {
      return (
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-end gap-3 flex-wrap">
            {selectorsJSX}
          </div>
        </div>
      );
    }

    // Minimal mode: Filter out Data Source and Query Key selectors
    try {
      const controlsDiv = childrenArr[0];
      const allControls = React.Children.toArray(controlsDiv.props.children);
      
      const filteredControls = allControls.filter(child => {
        if (!child || !child.props) return true;
        
        // Find the label text to identify the control
        // DataProvider uses: <div className="..."><label>Label Text</label>...</div>
        const labelElement = child.props.children && child.props.children[0];
        const labelText = labelElement && labelElement.props && labelElement.props.children;
        
        // Hide only Data Source and Query Key dropdowns
        if (labelText === 'Data Source' || labelText === 'Query Key') {
          return false;
        }
        return true;
      });

      return (
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-end gap-3 flex-wrap">
            {filteredControls}
          </div>
        </div>
      );
    } catch (error) {
      console.warn('TableDataProvider: Failed to filter selectors, falling back to default', error);
      return (
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-end gap-3 flex-wrap">
            {selectorsJSX}
          </div>
        </div>
      );
    }
  }, [showSelectors, hideControls]);

  const stableOnVariablesChange = useCallback((vars) => {
    onVariablesChangeRef.current?.(vars);
  }, []);

  const stableOnDataSourceChange = useCallback((ds) => {
    onDataSourceChangeRef.current?.(ds);
  }, []);

  // Merge individual props with the variableOverrides object
  // Individual props (like 'First' or 'Operator') take precedence
  const mergedVariables = useMemo(() => {
    return {
      ...otherProps,
      ...(variableOverrides || {})
    };
  }, [JSON.stringify(otherProps), JSON.stringify(variableOverrides)]);

  // Stabilize merged variables to prevent infinite fetch loops
  const stringifiedOverrides = JSON.stringify(mergedVariables);
  const stableOverrides = useMemo(() => JSON.parse(stringifiedOverrides), [stringifiedOverrides]);

  // Sync props to localStorage safely
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const syncToStore = (key, value) => {
        if (value !== undefined && value !== null) {
          const stringified = JSON.stringify(value);
          if (window.localStorage.getItem(key) !== stringified) {
            window.localStorage.setItem(key, stringified);
          }
        }
      };

      syncToStore('datatable-dataSource', dataSource || 'offline');
      syncToStore('datatable-selectedQueryKey', queryKey);
    }
  }, [dataSource, queryKey]);

  return (
    <DataProvider
      key={`${dataSource || 'offline'}-${queryKey || 'default'}`}
      offlineData={data}
      onDataChange={stableOnDataChange}
      onTableDataChange={stableOnTableDataChange}
      onVariablesChange={stableOnVariablesChange}
      onDataSourceChange={stableOnDataSourceChange}
      variableOverrides={stableOverrides}
      renderHeaderControls={stableRenderHeaderControls}
    >
      {children}
    </DataProvider>
  );
};

export default TableDataProvider;

