'use client';

import { useState, useCallback } from 'react';
import DataProviderNew from '../share/datatable/components/DataProviderNew';
import { DataProvider as PlasmicDataProvider } from "@plasmicapp/loader-nextjs";
import { TableProvider } from './TableContext';

export default function DataProvider({
  useOrchestrationLayer = false,
  children,
  dataSlot,
  renderHeaderControls,
  onTableDataChange,
  setControlContextData,
  ...props
}) {
  const [consolidatedData, setConsolidatedData] = useState([]);

  // Capture table data changes and expose to Plasmic
  const handleTableDataChange = useCallback((data) => {
    setConsolidatedData(data || []);
    
    // Call parent callback if provided
    if (onTableDataChange) {
      onTableDataChange(data);
    }
    
    // Update Plasmic context if setControlContextData is provided
    if (setControlContextData) {
      setControlContextData({ data: data || [] });
    }
  }, [onTableDataChange, setControlContextData]);

  return (
    <DataProviderNew 
      {...props} 
      useOrchestrationLayer={useOrchestrationLayer}
      renderHeaderControls={renderHeaderControls}
      onTableDataChange={handleTableDataChange}
    >
      <PlasmicDataProvider name="data" data={consolidatedData}>
        <TableProvider value={consolidatedData}>
          {children}
          {dataSlot && (
            <div style={{ height: 'auto' }}>
              {dataSlot}
            </div>
          )}
        </TableProvider>
      </PlasmicDataProvider>
    </DataProviderNew>
  );
}

