'use client';

import React, { useContext, useState } from 'react';
import DataProviderNew from '../share/datatable/components/DataProviderNew';
import { TableOperationsContext } from '../share/datatable/contexts/TableOperationsContext';
import { DataProvider as PlasmicDataProvider } from "@plasmicapp/loader-nextjs";

function Inner({ children, dataSlot, rawTableData, tableData }) {
  const contextData = useContext(TableOperationsContext);
  const data = { rawTableData, tableData };
  if (contextData) {
    Object.keys(contextData).forEach(key => {
      if (typeof contextData[key] !== 'function') {
        data[key] = contextData[key];
      }
    });
  }
  return <PlasmicDataProvider name="data" data={data}>{children}{dataSlot}</PlasmicDataProvider>;
}

export default function DataProviderWrapper(props) {
  const [rawTableData, setRawTableData] = useState(null);
  const [tableData, setTableData] = useState(null);
  return (
    <DataProviderNew {...props} onRawDataChange={(d) => { setRawTableData(d); props.onRawDataChange?.(d); }} onTableDataChange={(d) => { setTableData(d); props.onTableDataChange?.(d); }}>
      <Inner rawTableData={rawTableData} tableData={tableData} dataSlot={props.dataSlot}>{props.children}</Inner>
    </DataProviderNew>
  );
}

