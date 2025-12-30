'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { TabView, TabPanel } from 'primereact/tabview';
import { startCase } from 'lodash';
import DataTableComponent from '@/components/DataTable';
import { useTableDialogStore } from '../stores/useTableDialogStore';
import { detectArrayOfObjectFields, flattenParentItems, removeIndexKeys } from '../utils/data-flattener';
import { SingleFieldSelector } from './SingleFieldSelector';

export function TableDialog({ visible, onHide, responseData }) {
  const { activeTab, setActiveTab, selectedFlattenField, setSelectedFlattenField, processedData, setProcessedData, reset } = useTableDialogStore();

  const formatFieldName = useCallback((key) => {
    return startCase(key.split('__').join(' ').split('_').join(' '));
  }, []);

  // Compute queryKeys early for use in hooks
  const queryKeys = useMemo(() => {
    if (!responseData) return [];
    return Object.keys(responseData).filter(key => responseData[key] && responseData[key].length > 0);
  }, [responseData]);

  // Get array-of-object fields from the original data (not processed)
  // This should be based on the original responseData, not processedData
  // Use useMemo to recalculate when activeTab changes
  const arrayOfObjectFields = useMemo(() => {
    if (queryKeys.length === 0 || activeTab >= queryKeys.length || !responseData) return [];
    const originalData = responseData[queryKeys[activeTab]];
    const fields = detectArrayOfObjectFields(originalData);
    return fields;
  }, [responseData, queryKeys, activeTab]);

  // Process data when responseData or selectedFlattenField changes
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

      if (selectedFlattenField && data && data.length > 0) {
        // Apply flattening if a field is selected
        processed[queryKey] = flattenParentItems(data, selectedFlattenField);
      } else {
        // Use original data
        processed[queryKey] = data;
      }
    }

    // Remove __index__ keys from all processed data at the end
    const cleanedProcessed = {};
    for (const [key, value] of Object.entries(processed)) {
      cleanedProcessed[key] = removeIndexKeys(value);
    }

    setProcessedData(cleanedProcessed);
  }, [responseData, selectedFlattenField, queryKeys, setProcessedData]);

  // Reset selected field when dialog closes
  useEffect(() => {
    if (!visible) {
      reset();
    }
  }, [visible, reset]);

  // Wrapper to handle field selection via SingleFieldSelector
  const handleFlattenFieldChange = useCallback((field) => {
    setSelectedFlattenField(field);
  }, [setSelectedFlattenField]);

  // Clear selected field if it doesn't exist in the current tab's available fields
  useEffect(() => {
    if (selectedFlattenField && arrayOfObjectFields.length > 0 && !arrayOfObjectFields.includes(selectedFlattenField)) {
      setSelectedFlattenField(null);
    }
  }, [arrayOfObjectFields, selectedFlattenField, setSelectedFlattenField]);

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
        {/* Left side: Table/TabView (80%) */}
        <div style={{ flex: '0 0 80%', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
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

        {/* Right side: Controls (20%) */}
        <div style={{ flex: '0 0 20%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid #e5e7eb', padding: '1rem', backgroundColor: '#f9fafb' }}>
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Controls</h3>
            
            {/* Flatten Field Selector */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-700 block">
                Flatten Array Field:
              </label>
              {arrayOfObjectFields.length > 0 ? (
                <SingleFieldSelector
                  columns={arrayOfObjectFields}
                  selectedField={selectedFlattenField}
                  onSelectionChange={handleFlattenFieldChange}
                  formatFieldName={formatFieldName}
                  placeholder="Select field to flatten..."
                />
              ) : (
                <div className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                  No array-of-object fields available
                </div>
              )}
              {arrayOfObjectFields.length === 0 && (
                <span className="text-xs text-orange-600 block mt-1">
                  No array-of-object fields detected
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

