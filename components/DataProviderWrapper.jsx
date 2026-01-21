'use client';

import React, { useContext } from 'react';
import DataProviderNew from '../share/datatable/components/DataProviderNew';
import { TableOperationsContext } from '../share/datatable/contexts/TableOperationsContext';
import { DataProvider as PlasmicDataProvider } from "@plasmicapp/loader-nextjs";

// Wrapper component that exposes TableOperationsContext data to Plasmic
function DataProviderWrapperInner({ children, dataSlot }) {
  const contextData = useContext(TableOperationsContext);

  // Use context data directly - no need to reassign
  return (
    <PlasmicDataProvider name="data" data={contextData || {}}>
      {children}
      {dataSlot}
    </PlasmicDataProvider>
  );
}

// Main wrapper component
export default function DataProviderWrapper(props) {
  return (
    <DataProviderNew {...props}>
      <DataProviderWrapperInner dataSlot={props.dataSlot}>
        {props.children}
      </DataProviderWrapperInner>
    </DataProviderNew>
  );
}

