'use client';

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
  } = props;

  // Sync props to localStorage so DataProvider can see them
  if (typeof window !== 'undefined') {
    if (dataSource !== undefined && dataSource !== null) {
      window.localStorage.setItem('datatable-dataSource', JSON.stringify(dataSource));
    }
    if (queryKey !== undefined && queryKey !== null) {
      window.localStorage.setItem('datatable-selectedQueryKey', JSON.stringify(queryKey));
    }
  }

  return (
    <DataProvider
      key={`${dataSource}-${queryKey}`}
      offlineData={data}
      onDataChange={onDataChange}
      onTableDataChange={onTableDataChange}
      onVariablesChange={onVariablesChange}
      onDataSourceChange={onDataSourceChange}
      variableOverrides={variableOverrides}
      renderHeaderControls={(selectorsJSX) => showSelectors ? (
        <div className="px-4 py-3 border-b border-gray-200 bg-white">
          <div className="flex items-end gap-3 flex-wrap">
            {selectorsJSX}
          </div>
        </div>
      ) : null}
    >
      {children}
    </DataProvider>
  );
};

export default TableDataProvider;

