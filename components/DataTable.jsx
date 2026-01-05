'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Toast } from 'primereact/toast';
import { Splitter, SplitterPanel } from 'primereact/splitter';
import { Sidebar } from 'primereact/sidebar';
import { TabView, TabPanel } from 'primereact/tabview';
import DataTableComponent from '../share/datatable/components/DataTable';
import DataTableControls from '../share/datatable/components/DataTableControls';
import DataProvider from '../share/datatable/components/DataProvider';
import data from '../resource/data';
import Target from '../resource/target';
import { uniq, flatMap, keys, isEmpty, startCase, filter as lodashFilter, get, isNil, debounce } from 'lodash';
import { saveSettingsForDataSource, loadSettingsForDataSource } from '../share/datatable/utils/settingsService';

// We use the exact same state management hooks as the native page.jsx
function useLocalStorageBoolean(key, defaultValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      if (item === null || item === undefined) return defaultValue;
      const parsed = JSON.parse(item);
      return typeof parsed === 'boolean' ? parsed : defaultValue;
    } catch (error) {
      try { window.localStorage.removeItem(key); } catch { }
      return defaultValue;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null && item !== undefined) {
        const parsed = JSON.parse(item);
        if (typeof parsed === 'boolean') setValue(parsed);
      }
    } catch (error) { }
  }, [key]);

  const setStoredValue = (newValue) => {
    try {
      if (typeof newValue === 'boolean') {
        const serialized = JSON.stringify(newValue);
        if (typeof window !== 'undefined') window.localStorage.setItem(key, serialized);
        setValue(newValue);
      }
    } catch (error) { console.error(`Error: ${key}`, error); }
  };
  return [value, setStoredValue];
}

function useLocalStorageArray(key, defaultValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      if (item === null || item === undefined) return defaultValue;
      const parsed = JSON.parse(item);
      return Array.isArray(parsed) ? parsed : defaultValue;
    } catch (error) {
      try { window.localStorage.removeItem(key); } catch { }
      return defaultValue;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null && item !== undefined) {
        const parsed = JSON.parse(item);
        if (Array.isArray(parsed)) setValue(parsed);
      }
    } catch (error) { }
  }, [key]);

  const setStoredValue = (newValue) => {
    try {
      if (typeof newValue === 'function') {
        setValue(prev => {
          const updated = newValue(prev);
          if (Array.isArray(updated)) {
            const serialized = JSON.stringify(updated);
            if (typeof window !== 'undefined') window.localStorage.setItem(key, serialized);
            return updated;
          }
          return prev;
        });
      } else if (Array.isArray(newValue)) {
        const serialized = JSON.stringify(newValue);
        if (typeof window !== 'undefined') window.localStorage.setItem(key, serialized);
        setValue(newValue);
      }
    } catch (error) { console.error(`Error: ${key}`, error); }
  };
  return [value, setStoredValue];
}

function useLocalStorageString(key, defaultValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      if (item === null || item === undefined) return defaultValue;
      const parsed = JSON.parse(item);
      return (typeof parsed === 'string' || parsed === null) ? parsed : defaultValue;
    } catch (error) {
      try { window.localStorage.removeItem(key); } catch { }
      return defaultValue;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null && item !== undefined) {
        const parsed = JSON.parse(item);
        if (typeof parsed === 'string' || parsed === null) setValue(parsed);
      }
    } catch (error) { }
  }, [key]);

  const setStoredValue = (newValue) => {
    try {
      if (typeof newValue === 'string' || newValue === null) {
        const serialized = JSON.stringify(newValue);
        if (typeof window !== 'undefined') window.localStorage.setItem(key, serialized);
        setValue(newValue);
      }
    } catch (error) { console.error(`Error: ${key}`, error); }
  };
  return [value, setStoredValue];
}

function useLocalStorageNumber(key, defaultValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const item = window.localStorage.getItem(key);
      if (item === null || item === undefined) return defaultValue;
      const parsed = JSON.parse(item);
      return (typeof parsed === 'number' && !isNaN(parsed) && parsed > 0) ? parsed : defaultValue;
    } catch (error) {
      try { window.localStorage.removeItem(key); } catch { }
      return defaultValue;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const item = window.localStorage.getItem(key);
      if (item !== null && item !== undefined) {
        const parsed = JSON.parse(item);
        if (typeof parsed === 'number' && !isNaN(parsed) && parsed > 0) setValue(parsed);
      }
    } catch (error) { }
  }, [key]);

  const setStoredValue = (newValue) => {
    try {
      if (typeof newValue === 'number' && !isNaN(newValue) && newValue > 0) {
        const serialized = JSON.stringify(newValue);
        if (typeof window !== 'undefined') window.localStorage.setItem(key, serialized);
        setValue(newValue);
      }
    } catch (error) { console.error(`Error: ${key}`, error); }
  };
  return [value, setStoredValue];
}

const DataTableWrapper = (props) => {
  const { className, showControls = true } = props;
  const toast = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tableData, setTableData] = useState(props.data || data);
  const [currentDataSource, setCurrentDataSource] = useState(null);

  // All state precisely mirroring native page.jsx
  const [enableSort, setEnableSort] = useLocalStorageBoolean('datatable-enableSort', true);
  const [enableFilter, setEnableFilter] = useLocalStorageBoolean('datatable-enableFilter', true);
  const [enableSummation, setEnableSummation] = useLocalStorageBoolean('datatable-enableSummation', true);
  const [enableCellEdit, setEnableCellEdit] = useLocalStorageBoolean('datatable-enableCellEdit', false);
  const [rowsPerPageOptionsRaw, setRowsPerPageOptionsRaw] = useLocalStorageArray('datatable-rowsPerPageOptions', [5, 10, 25, 50, 100, 200]);
  const [defaultRowsRaw, setDefaultRowsRaw] = useLocalStorageNumber('datatable-defaultRows', 10);
  const [textFilterColumns, setTextFilterColumns] = useLocalStorageArray('datatable-textFilterColumns', []);
  const [visibleColumns, setVisibleColumns] = useLocalStorageArray('datatable-visibleColumns', []);
  const [redFields, setRedFields] = useLocalStorageArray('datatable-redFields', []);
  const [greenFields, setGreenFields] = useLocalStorageArray('datatable-greenFields', []);
  const [outerGroupField, setOuterGroupField] = useLocalStorageString('datatable-outerGroupField', null);
  const [innerGroupField, setInnerGroupField] = useLocalStorageString('datatable-innerGroupField', null);
  const [nonEditableColumns, setNonEditableColumns] = useLocalStorageArray('datatable-nonEditableColumns', []);
  const [enableTargetData, setEnableTargetData] = useLocalStorageBoolean('datatable-enableTargetData', false);
  const [targetOuterGroupField, setTargetOuterGroupField] = useLocalStorageString('datatable-targetOuterGroupField', null);
  const [targetInnerGroupField, setTargetInnerGroupField] = useLocalStorageString('datatable-targetInnerGroupField', null);
  const [targetValueField, setTargetValueField] = useLocalStorageString('datatable-targetValueField', null);
  const [actualValueField, setActualValueField] = useLocalStorageString('datatable-actualValueField', null);
  
  const [queryVariables, setQueryVariables] = useState({});
  const [variableOverrides, setVariableOverrides] = useState({});

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [drawerData, setDrawerData] = useState([]);
  const [drawerTabs, setDrawerTabs] = useLocalStorageArray('datatable-drawerTabs', [{ id: `tab-${Date.now()}`, name: '', outerGroup: null, innerGroup: null }]);
  const [activeDrawerTabIndex, setActiveDrawerTabIndex] = useState(0);
  const [clickedDrawerValues, setClickedDrawerValues] = useState({ outerValue: null, innerValue: null });

  const [appHeaderOffset, setAppHeaderOffset] = useState(0);
  const [appHeaderZIndex, setAppHeaderZIndex] = useState(1000);
  const [sidebarHeaderOffset, setSidebarHeaderOffset] = useState(0);
  const [sidebarZIndex, setSidebarZIndex] = useState(1000);

  const originalTableDataRef = useRef(null);

  useEffect(() => {
    const calc = () => {
      const el = document.querySelector('.app-header-container');
      if (el) {
        setAppHeaderOffset(el.getBoundingClientRect().height);
        setAppHeaderZIndex(parseInt(window.getComputedStyle(el).zIndex) || 1000);
      }
    };
    calc();
    const h = debounce(calc, 100);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  useEffect(() => {
    if (!drawerVisible) return;
    const calc = () => {
      const sh = document.querySelector('.p-sidebar-header');
      const sb = document.querySelector('.p-sidebar');
      if (sh && sb) {
        setSidebarHeaderOffset(sh.getBoundingClientRect().height);
        setSidebarZIndex(parseInt(window.getComputedStyle(sb).zIndex) || 1000);
      }
    };
    const t = setTimeout(calc, 100);
    const h = debounce(calc, 100);
    window.addEventListener('resize', h);
    return () => { clearTimeout(t); window.removeEventListener('resize', h); };
  }, [drawerVisible]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) requestAnimationFrame(() => setIsLoading(false));
    else setIsLoading(false);
  }, []);

  const handleTableDataChange = (newTableData) => {
    setTableData(newTableData);
    if (newTableData && Array.isArray(newTableData)) originalTableDataRef.current = newTableData;
  };

  const handleDataSourceChange = useCallback((ds) => {
    setCurrentDataSource(ds);
    if (!ds) return;
    const s = loadSettingsForDataSource(ds);
    if (s) {
      if (s.enableSort !== undefined) setEnableSort(s.enableSort);
      if (s.enableFilter !== undefined) setEnableFilter(s.enableFilter);
      if (s.enableSummation !== undefined) setEnableSummation(s.enableSummation);
      if (s.enableCellEdit !== undefined) setEnableCellEdit(s.enableCellEdit);
      if (s.rowsPerPageOptions) setRowsPerPageOptionsRaw(s.rowsPerPageOptions);
      if (s.defaultRows !== undefined) setDefaultRowsRaw(s.defaultRows);
      if (s.textFilterColumns) setTextFilterColumns(s.textFilterColumns);
      if (s.visibleColumns) setVisibleColumns(s.visibleColumns);
      if (s.redFields) setRedFields(s.redFields);
      if (s.greenFields) setGreenFields(s.greenFields);
      if (s.outerGroupField !== undefined) setOuterGroupField(s.outerGroupField);
      if (s.innerGroupField !== undefined) setInnerGroupField(s.innerGroupField);
      if (s.nonEditableColumns) setNonEditableColumns(s.nonEditableColumns);
      if (s.enableTargetData !== undefined) setEnableTargetData(s.enableTargetData);
      if (s.targetOuterGroupField !== undefined) setTargetOuterGroupField(s.targetOuterGroupField);
      if (s.targetInnerGroupField !== undefined) setTargetInnerGroupField(s.targetInnerGroupField);
      if (s.targetValueField !== undefined) setTargetValueField(s.targetValueField);
      if (s.actualValueField !== undefined) setActualValueField(s.actualValueField);
      if (s.drawerTabs !== undefined) setDrawerTabs(s.drawerTabs);
    }
  }, []);

  const handleSaveSettings = () => {
    if (!currentDataSource) {
      toast.current?.show({ severity: 'warn', summary: 'Warning', detail: 'Select source first' });
      return;
    }
    const s = {
      enableSort, enableFilter, enableSummation, enableCellEdit,
      rowsPerPageOptions: rowsPerPageOptionsRaw, defaultRows: defaultRowsRaw, 
      textFilterColumns, visibleColumns, redFields, greenFields, 
      outerGroupField, innerGroupField, nonEditableColumns, 
      enableTargetData, targetOuterGroupField, targetInnerGroupField, 
      targetValueField, actualValueField, drawerTabs
    };
    try {
      saveSettingsForDataSource(currentDataSource, s);
      toast.current?.show({ severity: 'success', summary: 'Success', detail: 'Settings saved' });
    } catch (e) {
      toast.current?.show({ severity: 'error', summary: 'Error', detail: 'Save failed' });
    }
  };

  const handleOuterGroupClick = (rowData, column, value) => {
    const od = originalTableDataRef.current || tableData;
    if (!Array.isArray(od)) return;
    setClickedDrawerValues({ outerValue: value, innerValue: null });
    setActiveDrawerTabIndex(0);
    const fd = lodashFilter(od, (r) => {
      const rv = get(r, outerGroupField);
      return isNil(value) ? isNil(rv) : String(rv) === String(value);
    });
    setDrawerData(fd);
    setDrawerVisible(true);
  };

  const handleInnerGroupClick = (rowData, column, value) => {
    const od = originalTableDataRef.current || tableData;
    if (!Array.isArray(od)) return;
    const ov = get(rowData, outerGroupField);
    setClickedDrawerValues({ outerValue: ov, innerValue: value });
    setActiveDrawerTabIndex(0);
    const fd = lodashFilter(od, (r) => {
      const rov = get(r, outerGroupField);
      const riv = get(r, innerGroupField);
      let m = isNil(ov) ? isNil(rov) : String(rov) === String(ov);
      if (!m) return false;
      return isNil(value) ? isNil(riv) : String(riv) === String(value);
    });
    setDrawerData(fd);
    setDrawerVisible(true);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600 mb-4"></div>
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <Toast ref={toast} />
      <DataProvider
        offlineData={props.data || data}
        onDataChange={n => toast.current?.show(n)}
        onError={n => toast.current?.show(n)}
        onTableDataChange={handleTableDataChange}
        onDataSourceChange={handleDataSourceChange}
        onVariablesChange={setQueryVariables}
        variableOverrides={variableOverrides}
        renderHeaderControls={(sJSX) => (
          <div className="px-4 py-3 border-b border-gray-200 bg-white">
            <div className="flex items-end gap-3 flex-wrap">{sJSX}</div>
          </div>
        )}
      >
        <div className="flex-1 min-h-0">
          <Splitter style={{ height: '100%' }} layout="horizontal">
            <SplitterPanel className="flex flex-col min-w-0" size={80}>
              <div className="flex-1 p-4 overflow-auto">
                {tableData === null ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <i className="pi pi-table text-6xl text-gray-200 mb-4"></i>
                    <h3 className="text-lg font-medium text-gray-700">No Data</h3>
                  </div>
                ) : (
                  <DataTableComponent
                    data={tableData}
                    rowsPerPageOptions={rowsPerPageOptionsRaw}
                    defaultRows={defaultRowsRaw}
                    scrollable={false}
                    enableSort={enableSort}
                    enableFilter={enableFilter}
                    enableSummation={enableSummation}
                    textFilterColumns={textFilterColumns}
                    visibleColumns={visibleColumns}
                    onVisibleColumnsChange={setVisibleColumns}
                    redFields={redFields}
                    greenFields={greenFields}
                    outerGroupField={outerGroupField}
                    innerGroupField={innerGroupField}
                    enableCellEdit={enableCellEdit}
                    nonEditableColumns={nonEditableColumns}
                    onOuterGroupClick={handleOuterGroupClick}
                    onInnerGroupClick={handleInnerGroupClick}
                    targetData={enableTargetData ? Target : null}
                    targetOuterGroupField={enableTargetData ? targetOuterGroupField : null}
                    targetInnerGroupField={enableTargetData ? targetInnerGroupField : null}
                    targetValueField={enableTargetData ? targetValueField : null}
                    actualValueField={enableTargetData ? actualValueField : null}
                    appHeaderOffset={appHeaderOffset}
                    stickyHeaderZIndex={appHeaderZIndex + 1}
                    tableName="main"
                  />
                )}
              </div>
            </SplitterPanel>
            <SplitterPanel className="flex flex-col min-w-0 border-l border-gray-200" size={20}>
              <DataTableControls
                enableSort={enableSort} enableFilter={enableFilter} enableSummation={enableSummation} enableCellEdit={enableCellEdit}
                rowsPerPageOptions={rowsPerPageOptionsRaw} defaultRows={defaultRowsRaw}
                columns={uniq(flatMap(tableData || [], item => item && typeof item === 'object' ? keys(item) : []))}
                textFilterColumns={textFilterColumns} visibleColumns={visibleColumns} redFields={redFields} greenFields={greenFields}
                outerGroupField={outerGroupField} innerGroupField={innerGroupField} nonEditableColumns={nonEditableColumns}
                enableTargetData={enableTargetData} targetColumns={uniq(flatMap(Target, item => item && typeof item === 'object' ? keys(item) : []))}
                targetOuterGroupField={targetOuterGroupField} targetInnerGroupField={targetInnerGroupField}
                targetValueField={targetValueField} actualValueField={actualValueField}
                dataSource={currentDataSource} queryVariables={queryVariables} variableOverrides={variableOverrides}
                onVariableOverrideChange={setVariableOverrides} onSortChange={setEnableSort} onFilterChange={setEnableFilter}
                onSummationChange={setEnableSummation} onCellEditChange={setEnableCellEdit}
                onRowsPerPageOptionsChange={setRowsPerPageOptionsRaw} onDefaultRowsChange={setDefaultRowsRaw}
                onTextFilterColumnsChange={setTextFilterColumns} onVisibleColumnsChange={setVisibleColumns}
                onRedFieldsChange={setRedFields} onGreenFieldsChange={setGreenFields}
                onOuterGroupFieldChange={setOuterGroupField} onInnerGroupFieldChange={setInnerGroupField}
                onNonEditableColumnsChange={setNonEditableColumns} onEnableTargetDataChange={setEnableTargetData}
                onTargetOuterGroupFieldChange={setTargetOuterGroupField} onTargetInnerGroupFieldChange={setTargetInnerGroupField}
                onTargetValueFieldChange={setTargetValueField} onActualValueFieldChange={setActualValueField}
                onSaveSettings={handleSaveSettings} drawerTabs={drawerTabs} onDrawerTabsChange={setDrawerTabs}
                onAddDrawerTab={() => {
                  const nt = { id: `tab-${Date.now()}`, name: '', outerGroup: null, innerGroup: null };
                  setDrawerTabs(prev => [...prev, nt]);
                  setActiveDrawerTabIndex(drawerTabs.length);
                }}
                onRemoveDrawerTab={tid => {
                  if (drawerTabs.length <= 1) return;
                  const nts = drawerTabs.filter(t => t.id !== tid);
                  setDrawerTabs(nts);
                  if (activeDrawerTabIndex >= nts.length) setActiveDrawerTabIndex(nts.length - 1);
                }}
                onUpdateDrawerTab={(tid, u) => setDrawerTabs(prev => prev.map(t => t.id === tid ? { ...t, ...u } : t))}
              />
            </SplitterPanel>
          </Splitter>
        </div>
      </DataProvider>
      <Sidebar
        position="bottom" blockScroll visible={drawerVisible} onHide={() => setDrawerVisible(false)} style={{ height: '100vh' }}
        header={<h2 className="text-lg font-semibold m-0">{clickedDrawerValues.innerValue ? `${clickedDrawerValues.outerValue} : ${clickedDrawerValues.innerValue}` : clickedDrawerValues.outerValue || 'Details'}</h2>}
      >
        <div className="flex flex-col h-full">
          <TabView activeIndex={activeDrawerTabIndex} onTabChange={e => setActiveDrawerTabIndex(e.index)}>
            {drawerTabs.map(tab => (
              <TabPanel key={tab.id} header={tab.name || `Tab ${drawerTabs.indexOf(tab) + 1}`}>
                <div className="overflow-auto py-4">
                  {drawerData.length > 0 ? (
                    <DataTableComponent
                      data={drawerData} rowsPerPageOptions={rowsPerPageOptionsRaw} defaultRows={defaultRowsRaw} scrollable={false}
                      enableSort={enableSort} enableFilter={enableFilter} enableSummation={enableSummation}
                      textFilterColumns={textFilterColumns} visibleColumns={visibleColumns} onVisibleColumnsChange={setVisibleColumns}
                      redFields={redFields} greenFields={greenFields} outerGroupField={tab.outerGroup} innerGroupField={tab.innerGroup}
                      enableCellEdit={false} appHeaderOffset={sidebarHeaderOffset} stickyHeaderZIndex={sidebarZIndex + 1} tableName="sidebar"
                    />
                  ) : <p className="text-center text-gray-500">No data available</p>}
                </div>
              </TabPanel>
            ))}
          </TabView>
        </div>
      </Sidebar>
    </div>
  );
};

export default DataTableWrapper;
