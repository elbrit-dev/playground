'use client';

import React, { useContext, useState, useCallback, useMemo } from 'react';
import DataProviderNew from '../share/datatable/components/DataProviderNew';
import { TableOperationsContext } from '../share/datatable/contexts/TableOperationsContext';
import { DataProvider as PlasmicDataProvider } from "@plasmicapp/loader-nextjs";

// Wrapper component that exposes TableOperationsContext data to Plasmic
function DataProviderWrapperInner({ children, dataSlot, rawTableData, tableData }) {
  const contextData = useContext(TableOperationsContext);

  // Use context data directly, just add rawTableData and tableData if not already present
  const consolidatedData = useMemo(() => {
    if (!contextData) return { rawTableData, tableData };
    
    return {
      ...contextData,
      // Add rawTableData and tableData if they're not in context
      ...(rawTableData && !contextData.rawTableData && { rawTableData }),
      ...(tableData && !contextData.tableData && { tableData }),
    };
  }, [contextData, rawTableData, tableData]);

  return (
    <PlasmicDataProvider name="data" data={consolidatedData}>
      {children}
      {dataSlot}
    </PlasmicDataProvider>
  );
}

// Main wrapper component
export default function DataProviderWrapper(props) {
  const [rawTableData, setRawTableData] = useState(null);
  const [tableData, setTableData] = useState(null);

  const handleRawDataChange = useCallback((data) => {
    setRawTableData(data);
    if (props.onRawDataChange) {
      props.onRawDataChange(data);
    }
  }, [props.onRawDataChange]);

  const handleTableDataChange = useCallback((data) => {
    setTableData(data);
    if (props.onTableDataChange) {
      props.onTableDataChange(data);
    }
  }, [props.onTableDataChange]);

  return (
    <DataProviderNew 
      {...props}
      onRawDataChange={handleRawDataChange}
      onTableDataChange={handleTableDataChange}
    >
      <DataProviderWrapperInner 
        dataSlot={props.dataSlot}
        rawTableData={rawTableData}
        tableData={tableData}
      >
        {props.children}
      </DataProviderWrapperInner>
    </DataProviderNew>
  );
}

