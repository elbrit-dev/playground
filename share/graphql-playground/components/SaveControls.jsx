'use client';

import React, { useEffect, useMemo, useRef, useCallback, useImperativeHandle } from 'react';
import { useGraphiQL } from '@graphiql/react';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { confirmDialog } from 'primereact/confirmdialog';
import { Tree } from 'primereact/tree';
import { OverlayPanel } from 'primereact/overlaypanel';
import { print } from 'graphql';
import { useSaveControlsStore } from '../stores/useSaveControlsStore';
import { useTableDialogStore } from '../stores/useTableDialogStore';
import { useAppStore } from '../stores/useAppStore';
import { extractOperationName } from '../utils/graphql-parser';
import { findNodeByKey } from '../utils/query-matcher';
import { firestoreService } from '../services/firestoreService';
import { detectArrayOfObjectFields } from '../utils/data-flattener';
import { SingleFieldSelector } from './SingleFieldSelector';
import { startCase } from 'lodash';

export const SaveControls = React.forwardRef((props, ref) => {
  const {
    clientSave,
    setClientSave,
    treeNodes,
    selectedKeys,
    setSelectedKeys,
    expandedKeys,
    setExpandedKeys,
    month,
    setMonth,
    monthIndexKeys,
    setMonthIndexKeys,
    monthIndexExpandedKeys,
    setMonthIndexExpandedKeys,
    loadQueryData,
    reset: resetSaveControls,
  } = useSaveControlsStore();
  const { selectedFlattenField, setSelectedFlattenField } = useTableDialogStore();
  const queryEditor = useGraphiQL((state) => state.queryEditor);
  const variableEditor = useGraphiQL((state) => state.variableEditor);
  const currentQuery = useGraphiQL((state) => state.queryEditor?.getValue() || '');
  const activeTabIndex = useGraphiQL((state) => state.activeTabIndex) ?? 0;
  const tabData = useAppStore((state) => state.tabData);
  const currentTabData = tabData[activeTabIndex] || { hasSuccessfulQuery: false, transformedData: null };
  const transformedData = currentTabData.transformedData;
  const indexFieldOp = useRef(null);
  const monthIndexFieldOp = useRef(null);

  // Debug logging for flatten field selector visibility
  useEffect(() => {
    console.log('[SaveControls] Debug - Flatten Field Selector Visibility:', {
      clientSave,
      activeTabIndex,
      hasTransformedData: !!transformedData,
      transformedDataKeys: transformedData ? Object.keys(transformedData) : [],
      currentTabData,
      tabDataKeys: Object.keys(tabData),
    });
  }, [clientSave, activeTabIndex, transformedData, currentTabData, tabData]);

  // Load existing document data when query changes (including tab switches)
  useEffect(() => {
    if (queryEditor) {
      const queryString = currentQuery || queryEditor.getValue() || '';
      loadQueryData(queryString).catch((error) => {
        console.error('Error loading query data:', error);
        resetSaveControls();
      });
    }
  }, [queryEditor, currentQuery, loadQueryData, resetSaveControls]);

  // Clear monthIndexKeys when month is cleared
  useEffect(() => {
    if (!month) {
      setMonthIndexKeys(null);
      setMonthIndexExpandedKeys({});
    }
  }, [month, setMonthIndexKeys, setMonthIndexExpandedKeys]);

  // Cleanup: Reset monthIndexKeys if it's a function (from previous bug with function updater)
  useEffect(() => {
    if (typeof monthIndexKeys === 'function') {
      setMonthIndexKeys(null);
      setMonthIndexExpandedKeys({});
    }
  }, [monthIndexKeys, setMonthIndexKeys, setMonthIndexExpandedKeys]);

  // Update variables with startDate and endDate when month changes
  useEffect(() => {
    if (!month || !variableEditor) return;

    // Compute startDate (first day of month) and endDate (last day of month)
    const year = month.getFullYear();
    const monthIndex = month.getMonth(); // 0-11

    // Start date: first day of the month
    const startDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;

    // End date: last day of the month
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    const endDate = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Get current variables
    const currentVariablesString = variableEditor.getValue() || '';
    let variables = {};

    // Parse existing variables if they exist
    if (currentVariablesString.trim()) {
      try {
        variables = JSON.parse(currentVariablesString);
      } catch (e) {
        // If parsing fails, start with empty object
        variables = {};
      }
    }

    // Update or add startDate and endDate
    variables.startDate = startDate;
    variables.endDate = endDate;

    // Set updated variables back to editor
    const updatedVariablesString = JSON.stringify(variables, null, 2);
    variableEditor.setValue(updatedVariablesString);
  }, [month, variableEditor]);

  // Clear monthIndexKeys when selectedKeys changes (parent may have changed)
  useEffect(() => {
    if (!selectedKeys) {
      // Clear monthIndexKeys if selectedKeys is cleared
      setMonthIndexKeys(null);
      setMonthIndexExpandedKeys({});
      return;
    }

    // Only validate if monthIndexKeys is already set
    // Get current value from store (Zustand doesn't support function updaters like useState)
    const currentMonthIndexKeys = monthIndexKeys;
    if (currentMonthIndexKeys && typeof currentMonthIndexKeys === 'string') {
      // Get the top-level key (first part of the path)
      const topLevelKey = selectedKeys.split('.')[0];
      // Check if monthIndexKeys is still a valid child of the top-level parent
      if (!currentMonthIndexKeys.startsWith(topLevelKey + '.')) {
        setMonthIndexKeys(null);
        setMonthIndexExpandedKeys({});
      }
    }
  }, [selectedKeys, monthIndexKeys, setMonthIndexKeys, setMonthIndexExpandedKeys]);

  const formatFieldName = useCallback((key) => {
    if (!key || !treeNodes.length) return String(key || '');
    const node = findNodeByKey(treeNodes, key);
    if (!node) return String(key);

    const parts = key.split('.');
    const pathNames = [];
    for (let i = 0; i < parts.length; i++) {
      const currentKey = parts.slice(0, i + 1).join('.');
      const n = findNodeByKey(treeNodes, currentKey);
      if (n?.data?.name) {
        pathNames.push(n.data.name);
      }
    }
    // Filter out "edges", and "node" from the path for display
    const filteredPathNames = pathNames.filter(name => name !== 'edges' && name !== 'node');
    return filteredPathNames.length > 0 ? filteredPathNames.join(' > ') : String(key);
  }, [treeNodes]);

  const formatFlattenFieldName = useCallback((key) => {
    return startCase(key.split('__').join(' ').split('_').join(' '));
  }, []);

  // Compute array-of-object fields from transformed data
  // Combine fields from all query keys to show all available options
  const arrayOfObjectFields = useMemo(() => {
    console.log('[SaveControls] Computing arrayOfObjectFields, transformedData:', transformedData);
    if (!transformedData) {
      console.log('[SaveControls] No transformedData, returning empty array');
      return [];
    }
    // Get all query keys from transformed data
    const queryKeys = Object.keys(transformedData).filter(key => transformedData[key] && transformedData[key].length > 0);
    console.log('[SaveControls] Query keys:', queryKeys);
    if (queryKeys.length === 0) {
      console.log('[SaveControls] No query keys with data, returning empty array');
      return [];
    }

    // Combine fields from all query keys
    const allFields = new Set();
    for (const queryKey of queryKeys) {
      const data = transformedData[queryKey];
      console.log(`[SaveControls] Processing query key "${queryKey}", data length:`, data?.length);
      const fields = detectArrayOfObjectFields(data);
      console.log(`[SaveControls] Detected fields for "${queryKey}":`, fields);
      fields.forEach(field => allFields.add(field));
    }

    const result = Array.from(allFields).sort();
    console.log('[SaveControls] Final arrayOfObjectFields:', result);
    return result;
  }, [transformedData]);

  const handleNodeSelect = (e) => {
    // Only allow selection of leaf nodes (nodes without children)
    // For non-leaf nodes, toggle expand/collapse
    const selectedKey = e.value;
    if (selectedKey) {
      const node = findNodeByKey(treeNodes, selectedKey);
      // Check if node is a leaf (no children or empty children array)
      const isLeaf = !node || !node.children || node.children.length === 0;
      
      if (isLeaf) {
        setSelectedKeys(selectedKey);
        if (indexFieldOp.current) {
          indexFieldOp.current.hide();
        }
      } else {
        // For non-leaf nodes, toggle expand/collapse instead of selecting
        const currentExpandedKeys = expandedKeys || {};
        const isExpanded = !!currentExpandedKeys[selectedKey];
        
        if (isExpanded) {
          // Collapse: remove the key from expandedKeys
          const { [selectedKey]: _, ...rest } = currentExpandedKeys;
          setExpandedKeys(rest);
        } else {
          // Expand: add the key to expandedKeys
          setExpandedKeys({
            ...currentExpandedKeys,
            [selectedKey]: true,
          });
        }
        
        // Prevent selection of non-leaf nodes by keeping current selection
        setSelectedKeys(selectedKeys);
      }
    } else {
      setSelectedKeys(null);
    }
  };

  const handleToggle = (event) => {
    setExpandedKeys(event.value);
  };

  const handleMonthIndexNodeSelect = (e) => {
    // Only allow selection of leaf nodes (nodes without children)
    // For non-leaf nodes, toggle expand/collapse
    const selectedKey = e.value;
    if (selectedKey) {
      const node = findNodeByKey(monthIndexTreeNodes, selectedKey);
      // Check if node is a leaf (no children or empty children array)
      const isLeaf = !node || !node.children || node.children.length === 0;
      
      if (isLeaf) {
        setMonthIndexKeys(selectedKey);
        if (monthIndexFieldOp.current) {
          monthIndexFieldOp.current.hide();
        }
      } else {
        // For non-leaf nodes, toggle expand/collapse instead of selecting
        const currentExpandedKeys = monthIndexExpandedKeys || {};
        const isExpanded = !!currentExpandedKeys[selectedKey];
        
        if (isExpanded) {
          // Collapse: remove the key from expandedKeys
          const { [selectedKey]: _, ...rest } = currentExpandedKeys;
          setMonthIndexExpandedKeys(rest);
        } else {
          // Expand: add the key to expandedKeys
          setMonthIndexExpandedKeys({
            ...currentExpandedKeys,
            [selectedKey]: true,
          });
        }
        
        // Prevent selection of non-leaf nodes by keeping current selection
        setMonthIndexKeys(monthIndexKeys);
      }
    } else {
      setMonthIndexKeys(null);
    }
  };

  const handleMonthIndexToggle = (event) => {
    setMonthIndexExpandedKeys(event.value);
  };

  const monthIndexTreeNodes = useMemo(() => {
    if (!selectedKeys) return [];
    // Get the top-level parent node (first part of the key path)
    const topLevelKey = selectedKeys.split('.')[0];
    const topLevelNode = findNodeByKey(treeNodes, topLevelKey);
    if (!topLevelNode) return [];
    return [topLevelNode];
  }, [selectedKeys, treeNodes]);

  const handleSave = useCallback(() => {
    if (!queryEditor) return;

    // Capture selectedFlattenField at the time handleSave is called
    // so it persists even if the store value changes before confirmDialog accept callback
    const capturedSelectedFlattenField = selectedFlattenField;

    const queryString = queryEditor.getValue() || '';
    const variablesString = variableEditor?.getValue() || '';
    const operationName = extractOperationName(queryString);

    if (!operationName) {
      confirmDialog({
        message: 'Please add an operation name to your query before saving.',
        header: 'Cannot Save Query',
        acceptLabel: 'OK',
        accept: () => { },
      });
      return;
    }

    // Index field is only required when clientSave is enabled
    if (clientSave && !selectedKeys) {
      confirmDialog({
        message: 'Please select an index field before saving.',
        header: 'Index Field Required',
        acceptLabel: 'OK',
        accept: () => { },
      });
      return;
    }

    // If month is selected, monthIndex is mandatory (only for client save)
    if (clientSave && month && !monthIndexKeys) {
      confirmDialog({
        message: 'Please select a month index field when a month is selected.',
        header: 'Month Index Field Required',
        acceptLabel: 'OK',
        accept: () => { },
      });
      return;
    }

    // Build selected query
    const buildSelectedQuery = () => {
      // Only build query if clientSave is enabled and selectedKeys exists
      if (!clientSave || treeNodes.length === 0 || !selectedKeys) return '';

      const selectedNode = findNodeByKey(treeNodes, selectedKeys);
      if (!selectedNode) return '';

      const topLevelKey = selectedKeys.split('.')[0];
      const topLevelNode = findNodeByKey(treeNodes, topLevelKey);
      if (!topLevelNode) return '';

      const parts = selectedKeys.split('.');
      let currentNodes = treeNodes;
      const pathNodes = [];

      for (let i = 0; i < parts.length; i++) {
        const currentKey = parts.slice(0, i + 1).join('.');
        const node = findNodeByKey(currentNodes, currentKey);
        if (node) {
          pathNodes.push(node);
          if (node.children) {
            currentNodes = node.children;
          }
        }
      }

      const createFieldSelection = (node, childSelections = null) => {
        const originalSelection = node.data.selection;

        if (originalSelection) {
          const field = {
            kind: 'Field',
            name: originalSelection.name,
            ...(originalSelection.alias && { alias: originalSelection.alias }),
            ...(originalSelection.arguments && originalSelection.arguments.length > 0 && {
              arguments: originalSelection.arguments
            }),
            ...(childSelections && childSelections.length > 0 ? {
              selectionSet: {
                kind: 'SelectionSet',
                selections: childSelections
              }
            } : {})
          };
          return field;
        }

        return {
          kind: 'Field',
          name: { kind: 'Name', value: node.data.originalName || node.data.name },
          ...(node.data.alias && {
            alias: { kind: 'Name', value: node.data.name }
          }),
          ...(childSelections && childSelections.length > 0 ? {
            selectionSet: {
              kind: 'SelectionSet',
              selections: childSelections
            }
          } : {})
        };
      };

      const buildSelectionTree = (nodes, currentIndex) => {
        if (currentIndex < 0) return null;

        const node = nodes[currentIndex];
        const isLast = currentIndex === nodes.length - 1;
        const isFirst = currentIndex === 0;

        let childSelections = null;
        if (!isFirst) {
          childSelections = buildSelectionTree(nodes, currentIndex - 1);
        }

        if (isLast) {
          return {
            kind: 'Field',
            name: { kind: 'Name', value: node.data.name }
          };
        }

        let currentSelections = childSelections ? [childSelections] : [];

        if (childSelections && currentIndex > 0) {
          const childNode = nodes[currentIndex - 1];
          const childActualPath = childNode.data.actualPath || childNode.data.name;
          const childActualParts = childActualPath.split('.');
          const nodeActualPath = node.data.actualPath || node.data.name;
          const nodeActualParts = nodeActualPath.split('.');
          const relativeParts = childActualParts.slice(nodeActualParts.length);

          if (relativeParts.length > 1) {
            for (let i = relativeParts.length - 2; i >= 0; i--) {
              const wrapperName = relativeParts[i];
              currentSelections = [{
                kind: 'Field',
                name: { kind: 'Name', value: wrapperName },
                selectionSet: {
                  kind: 'SelectionSet',
                  selections: currentSelections
                }
              }];
            }
          }
        }

        const fieldSelection = createFieldSelection(node, currentSelections.length > 0 ? currentSelections : null);
        return fieldSelection;
      };

      let topLevelSelection;
      if (pathNodes.length === 1) {
        topLevelSelection = createFieldSelection(topLevelNode, null);
      } else {
        let childSelection = buildSelectionTree(pathNodes, pathNodes.length - 1);

        if (childSelection && pathNodes.length > 1) {
          const childNode = pathNodes[pathNodes.length - 1];
          const childActualPath = childNode.data.actualPath || childNode.data.name;
          const childActualParts = childActualPath.split('.');
          const topLevelActualPath = topLevelNode.data.actualPath || topLevelNode.data.name;
          const topLevelActualParts = topLevelActualPath.split('.');
          const relativeParts = childActualParts.slice(topLevelActualParts.length);

          if (relativeParts.length > 1) {
            let wrappedSelection = childSelection;
            for (let i = relativeParts.length - 2; i >= 0; i--) {
              const wrapperName = relativeParts[i];
              wrappedSelection = {
                kind: 'Field',
                name: { kind: 'Name', value: wrapperName },
                selectionSet: {
                  kind: 'SelectionSet',
                  selections: [wrappedSelection]
                }
              };
            }
            childSelection = wrappedSelection;
          }
        }

        topLevelSelection = createFieldSelection(topLevelNode, childSelection ? [childSelection] : null);
      }

      const operation = {
        kind: 'OperationDefinition',
        operation: 'query',
        selectionSet: {
          kind: 'SelectionSet',
          selections: [topLevelSelection]
        }
      };

      const document = {
        kind: 'Document',
        definitions: [operation]
      };

      try {
        return print(document);
      } catch (error) {
        console.error('Error printing query:', error);
        return `query {\n  ${topLevelNode.data.name}\n}`;
      }
    };

    const selectedQuery = buildSelectedQuery();

    // Build month index query (similar to buildSelectedQuery but for monthIndexKeys)
    const buildMonthIndexQuery = () => {
      // Only build query if clientSave is enabled and monthIndexKeys exists
      if (!clientSave || treeNodes.length === 0 || !monthIndexKeys) return '';

      const selectedNode = findNodeByKey(treeNodes, monthIndexKeys);
      if (!selectedNode) return '';

      const topLevelKey = monthIndexKeys.split('.')[0];
      const topLevelNode = findNodeByKey(treeNodes, topLevelKey);
      if (!topLevelNode) return '';

      const parts = monthIndexKeys.split('.');
      let currentNodes = treeNodes;
      const pathNodes = [];

      for (let i = 0; i < parts.length; i++) {
        const currentKey = parts.slice(0, i + 1).join('.');
        const node = findNodeByKey(currentNodes, currentKey);
        if (node) {
          pathNodes.push(node);
          if (node.children) {
            currentNodes = node.children;
          }
        }
      }

      const createFieldSelection = (node, childSelections = null) => {
        const originalSelection = node.data.selection;

        if (originalSelection) {
          const field = {
            kind: 'Field',
            name: originalSelection.name,
            ...(originalSelection.alias && { alias: originalSelection.alias }),
            ...(originalSelection.arguments && originalSelection.arguments.length > 0 && {
              arguments: originalSelection.arguments
            }),
            ...(childSelections && childSelections.length > 0 ? {
              selectionSet: {
                kind: 'SelectionSet',
                selections: childSelections
              }
            } : {})
          };
          return field;
        }
        return null;
      };

      const buildSelectionTree = (nodes, currentIndex) => {
        if (currentIndex < 0) return null;

        const node = nodes[currentIndex];
        const isLast = currentIndex === nodes.length - 1;
        const isFirst = currentIndex === 0;

        let childSelections = null;
        if (!isFirst) {
          childSelections = buildSelectionTree(nodes, currentIndex - 1);
        }

        if (isLast) {
          return {
            kind: 'Field',
            name: { kind: 'Name', value: node.data.name }
          };
        }

        let currentSelections = childSelections ? [childSelections] : [];

        if (childSelections && currentIndex > 0) {
          const childNode = nodes[currentIndex - 1];
          const childActualPath = childNode.data.actualPath || childNode.data.name;
          const childActualParts = childActualPath.split('.');
          const nodeActualPath = node.data.actualPath || node.data.name;
          const nodeActualParts = nodeActualPath.split('.');
          const relativeParts = childActualParts.slice(nodeActualParts.length);

          if (relativeParts.length > 1) {
            for (let i = relativeParts.length - 2; i >= 0; i--) {
              const wrapperName = relativeParts[i];
              currentSelections = [{
                kind: 'Field',
                name: { kind: 'Name', value: wrapperName },
                selectionSet: {
                  kind: 'SelectionSet',
                  selections: currentSelections
                }
              }];
            }
          }
        }

        const fieldSelection = createFieldSelection(node, currentSelections.length > 0 ? currentSelections : null);
        return fieldSelection;
      };

      let topLevelSelection;
      if (pathNodes.length === 1) {
        topLevelSelection = createFieldSelection(topLevelNode, null);
      } else {
        let childSelection = buildSelectionTree(pathNodes, pathNodes.length - 1);

        if (childSelection && pathNodes.length > 1) {
          const childNode = pathNodes[pathNodes.length - 1];
          const childActualPath = childNode.data.actualPath || childNode.data.name;
          const childActualParts = childActualPath.split('.');
          const topLevelActualPath = topLevelNode.data.actualPath || topLevelNode.data.name;
          const topLevelActualParts = topLevelActualPath.split('.');
          const relativeParts = childActualParts.slice(topLevelActualParts.length);

          if (relativeParts.length > 1) {
            let wrappedSelection = childSelection;
            for (let i = relativeParts.length - 2; i >= 0; i--) {
              const wrapperName = relativeParts[i];
              wrappedSelection = {
                kind: 'Field',
                name: { kind: 'Name', value: wrapperName },
                selectionSet: {
                  kind: 'SelectionSet',
                  selections: [wrappedSelection]
                }
              };
            }
            childSelection = wrappedSelection;
          }
        }

        topLevelSelection = createFieldSelection(topLevelNode, childSelection ? [childSelection] : null);
      }

      const operation = {
        kind: 'OperationDefinition',
        operation: 'query',
        selectionSet: {
          kind: 'SelectionSet',
          selections: [topLevelSelection]
        }
      };

      const document = {
        kind: 'Document',
        definitions: [operation]
      };

      try {
        return print(document);
      } catch (error) {
        console.error('Error printing month index query:', error);
        return `query {\n  ${topLevelNode.data.name}\n}`;
      }
    };

    const monthIndexQuery = (clientSave && month && monthIndexKeys) ? buildMonthIndexQuery() : '';

    let selectedPath = '';
    if (clientSave && selectedKeys) {
      selectedPath = formatFieldName(selectedKeys);
      if (!selectedPath && selectedKeys) {
        selectedPath = selectedKeys;
      }
    }

    let monthIndexPath = '';
    if (monthIndexKeys) {
      monthIndexPath = formatFieldName(monthIndexKeys);
      if (!monthIndexPath && monthIndexKeys) {
        monthIndexPath = monthIndexKeys;
      }
    }

    confirmDialog({
      message: (
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-sm mb-1">Query Name:</p>
            <p className="text-sm text-gray-700 font-mono">{operationName}</p>
          </div>
          <div>
            <p className="font-semibold text-sm mb-1">Type:</p>
            <p className="text-sm text-gray-700">{clientSave ? 'Client' : 'Live'}</p>
          </div>
          <div>
            <p className="font-semibold text-sm mb-1">Index Field:</p>
            <p className="text-sm text-gray-700 font-mono">{selectedPath || 'Not selected'}</p>
          </div>
          <div>
            <p className="font-semibold text-sm mb-1">Flatten Field:</p>
            <p className="text-sm text-gray-700 font-mono">{capturedSelectedFlattenField || 'Not selected'}</p>
          </div>
          {month && (
            <>
              <div>
                <p className="font-semibold text-sm mb-1">Month:</p>
                <p className="text-sm text-gray-700 font-mono">{month ? month.toLocaleDateString('en-US', { month: '2-digit', year: 'numeric' }) : 'Not selected'}</p>
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">Month Index Field:</p>
                <p className="text-sm text-gray-700 font-mono">{monthIndexPath || 'Not selected'}</p>
              </div>
            </>
          )}
        </div>
      ),
      header: 'Confirm Save Query',
      acceptLabel: 'Save',
      rejectLabel: 'Cancel',
      acceptClassName: 'p-confirm-dialog-save',
      rejectClassName: 'p-confirm-dialog-reject',
      accept: async () => {
        try {
          const queryToSave = queryString;
          const saveData = {
            body: queryToSave || '',
            clientSave: clientSave,
            index: selectedQuery || '',
            variables: variablesString || '',
            month: month !== null,
            ...(month && {
              monthDate: month.toISOString(),
              monthIndex: monthIndexQuery || '',
            }),
            ...(capturedSelectedFlattenField && {
              flattenField: capturedSelectedFlattenField,
            }),
          };
          await firestoreService.saveQuery(operationName, saveData);
        } catch (error) {
          console.error('Error saving query:', error);
          confirmDialog({
            message: 'Failed to save query. Please try again.',
            header: 'Error',
            acceptLabel: 'OK',
            accept: () => { },
          });
        }
      },
    });
  }, [clientSave, selectedKeys, month, monthIndexKeys, treeNodes, queryEditor, variableEditor, formatFieldName, selectedFlattenField]);

  // Expose handleSave via ref
  useImperativeHandle(ref, () => ({
    handleSave,
  }));

  return (
    <div className="graphiql-save-controls">
      {/* Live/Client Toggle */}
      <div className="graphiql-save-toggle">
        <span className={`graphiql-save-toggle-label ${!clientSave ? 'text-yellow-700 font-semibold' : 'text-gray-600'}`}>
          Live
        </span>
        <div
          className={`graphiql-save-toggle-switch ${clientSave ? 'client' : 'live'}`}
          onClick={() => setClientSave(!clientSave)}
        >
          <div className="graphiql-save-toggle-switch-handle"></div>
        </div>
        <span className={`graphiql-save-toggle-label ${clientSave ? 'text-green-700 font-semibold' : 'text-gray-600'}`}>
          Client
        </span>
      </div>

      {/* Index Field Selector - Only show when clientSave is enabled */}
      {clientSave && (
        <div className={`graphiql-index-selector ${selectedKeys ? 'has-selection' : ''}`}>
          <Button
            type="button"
            onClick={(e) => {
              console.log(treeNodes)
              if (treeNodes.length > 0 && indexFieldOp.current) {
                indexFieldOp.current.toggle(e);
              }
            }}
            disabled={treeNodes.length === 0}
            className="p-button-sm p-button-outlined"
            title={selectedKeys && formatFieldName ? String(formatFieldName(selectedKeys)) : 'Select index field'}
            style={{
              width: '100%',
              justifyContent: 'space-between',
              textAlign: 'left',
              padding: '0.5rem 0.75rem'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
              <i className="pi pi-sitemap" style={{ fontSize: '0.875rem', color: '#6b7280', flexShrink: 0 }}></i>
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: selectedKeys ? '#374151' : '#9ca3af',
                fontWeight: selectedKeys ? '500' : '400'
              }}>
                {selectedKeys ? (formatFieldName ? formatFieldName(selectedKeys) : String(selectedKeys)) : 'Select index field'}
              </span>
            </span>
            <i className="pi pi-chevron-down" style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem', flexShrink: 0 }}></i>
          </Button>
          <OverlayPanel
            ref={indexFieldOp}
            dismissable
            className="graphiql-index-overlay"
            style={{ width: '420px' }}
          >
            {treeNodes.length > 0 ? (
              <Tree
                value={treeNodes}
                selectionMode="single"
                selectionKeys={selectedKeys}
                onSelectionChange={handleNodeSelect}
                expandedKeys={expandedKeys}
                onToggle={handleToggle}
                filter
                filterMode="lenient"
                filterBy="data.labelText,data.name"
                filterPlaceholder="Search fields..."
                className="w-full"
              />
            ) : (
              <div className="px-4 py-6 text-sm text-gray-500 text-center bg-gray-50 rounded-lg">
                <i className="pi pi-info-circle text-gray-400 mb-2" style={{ fontSize: '1.25rem' }}></i>
                <p className="font-medium text-gray-600 mb-1">No query fields available</p>
                <p className="text-xs text-gray-500">
                  Please write a GraphQL query in the editor.
                </p>
              </div>
            )}
          </OverlayPanel>
        </div>
      )}

      {/* Flatten Field Selector - Show when data is available or field already has value */}
      {(() => {
        // Show if: 1) query has been executed (transformedData exists), OR 2) field already has a value
        const shouldShow = transformedData || selectedFlattenField;
        const hasFields = arrayOfObjectFields.length > 0;
        console.log('[SaveControls] Render - Flatten Field Selector:', {
          shouldShow,
          clientSave,
          hasTransformedData: !!transformedData,
          hasSelectedFlattenField: !!selectedFlattenField,
          hasFields,
          arrayOfObjectFieldsCount: arrayOfObjectFields.length,
          arrayOfObjectFields,
        });

        if (!shouldShow) {
          console.log('[SaveControls] Not showing selector - transformedData:', !!transformedData, 'selectedFlattenField:', !!selectedFlattenField);
          return null;
        }

        return (
          <div className={`graphiql-flatten-selector w-sm ${selectedFlattenField ? 'has-selection' : ''}`}>
            {hasFields || selectedFlattenField ? (
              <SingleFieldSelector
                columns={arrayOfObjectFields}
                selectedField={selectedFlattenField}
                onSelectionChange={setSelectedFlattenField}
                formatFieldName={formatFlattenFieldName}
                placeholder="Select flatten field..."
                showTag={false}
              />
            ) : (
              <div className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-center">
                No array-of-object fields available
              </div>
            )}
          </div>
        );
      })()}

      {/* Month Picker */}
      <div className="graphiql-month-picker">
        <Calendar
          value={month}
          onChange={(e) => setMonth(e.value)}
          view="month"
          dateFormat="mm/yy"
          placeholder="Select month"
          showIcon
          iconPos="left"
          className="w-full"
          inputStyle={{
            width: '100%',
            padding: '0.5rem 0.75rem',
            paddingRight: month ? '2.5rem' : '0.75rem',
            fontSize: '0.875rem'
          }}
        />
        {month && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMonth(null);
            }}
            style={{
              position: 'absolute',
              right: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#6b7280',
              borderRadius: '4px',
              transition: 'all 0.2s ease',
              zIndex: 10
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#fee2e2';
              e.currentTarget.style.color = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
            title="Clear month"
          >
            <i className="pi pi-times" style={{ fontSize: '0.875rem' }}></i>
          </button>
        )}
      </div>

      {/* Month Index Field Selector - Only show when clientSave is enabled and month is selected */}
      {clientSave && month && (
        <div className={`graphiql-index-selector ${monthIndexKeys ? 'has-selection' : ''}`}>
          <Button
            type="button"
            onClick={(e) => {
              if (monthIndexTreeNodes.length > 0 && monthIndexFieldOp.current) {
                monthIndexFieldOp.current.toggle(e);
              }
            }}
            disabled={!selectedKeys || monthIndexTreeNodes.length === 0}
            className="p-button-sm p-button-outlined"
            title={monthIndexKeys && formatFieldName ? String(formatFieldName(monthIndexKeys)) : 'Select month index field'}
            style={{
              width: '100%',
              justifyContent: 'space-between',
              textAlign: 'left',
              padding: '0.5rem 0.75rem'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
              <i className="pi pi-sitemap" style={{ fontSize: '0.875rem', color: '#6b7280', flexShrink: 0 }}></i>
              <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                color: monthIndexKeys ? '#374151' : '#9ca3af',
                fontWeight: monthIndexKeys ? '500' : '400'
              }}>
                {(() => {
                  // Safeguard: if monthIndexKeys is a function (from previous bug), reset it
                  if (typeof monthIndexKeys === 'function') {
                    setMonthIndexKeys(null);
                    return 'Select month index field';
                  }
                  return monthIndexKeys ? (formatFieldName ? formatFieldName(monthIndexKeys) : String(monthIndexKeys)) : 'Select month index field';
                })()}
              </span>
            </span>
            <i className="pi pi-chevron-down" style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: '0.5rem', flexShrink: 0 }}></i>
          </Button>
          <OverlayPanel
            ref={monthIndexFieldOp}
            dismissable
            className="graphiql-index-overlay"
            style={{ width: '420px' }}
          >
            {monthIndexTreeNodes.length > 0 ? (
              <Tree
                value={monthIndexTreeNodes}
                selectionMode="single"
                selectionKeys={monthIndexKeys}
                onSelectionChange={handleMonthIndexNodeSelect}
                expandedKeys={monthIndexExpandedKeys}
                onToggle={handleMonthIndexToggle}
                filter
                filterMode="lenient"
                filterBy="data.labelText,data.name"
                filterPlaceholder="Search fields..."
                className="w-full"
              />
            ) : (
              <div className="px-4 py-6 text-sm text-gray-500 text-center bg-gray-50 rounded-lg">
                <i className="pi pi-info-circle text-gray-400 mb-2" style={{ fontSize: '1.25rem' }}></i>
                <p className="font-medium text-gray-600 mb-1">No month index fields available</p>
                <p className="text-xs text-gray-500">
                  Please select an index field first.
                </p>
              </div>
            )}
          </OverlayPanel>
        </div>
      )}
    </div>
  );
});

SaveControls.displayName = 'SaveControls';

