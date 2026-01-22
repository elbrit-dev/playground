import React from 'react';
import { initPlasmicLoader, DataProvider as PlasmicDataProvider } from "@plasmicapp/loader-nextjs";
import DataTable from "./components/DataTable";
import TableDataProvider from "./components/TableDataProvider";
import DataProvider from "./share/datatable/components/DataProviderNew";
import DataTableNew from "./share/datatable/components/DataTableNew";
import PlasmicNavigation from "./components/PlasmicNavigation";
import jmespath_plus from '@metrichor/jmespath-plus';
import * as jmespath from 'jmespath';
import jsonata from 'jsonata';
import _ from 'lodash';

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "cwnJgvdnQpoepoZBvr68ae",
      token: "BdNuIur9T6Ip7PFDZvUFPN9Up4YDdzbVPkJ9WjUspBE49F7rQ9f7T6mqnnZ5U3iTKzvM9x99uXVbT6A"
    }
  ],
  preview: true,
});

// Helper component to provide global utilities
export const GlobalUtils = ({ children }) => {
  return (
    <PlasmicDataProvider name="utils" data={{ _, jmespath, jmespath_plus, jsonata }}>
      {children}
    </PlasmicDataProvider>
  );
};

PLASMIC.registerGlobalContext(GlobalUtils, {
  name: "GlobalUtils",
  props: {},
  providesData: true,
  importPath: "./plasmic-init",
});

PLASMIC.registerFunction(jmespath_plus.search, {
  name: "jmespath_plus",
  params: [
    { name: "data", type: "object" },
    { name: "expression", type: "string" }
  ],
  description: "Execute a JMESPath Plus expression on data"
});

PLASMIC.registerFunction(jmespath.search, {
  name: "jmespath_search",
  params: [
    { name: "data", type: "object" },
    { name: "expression", type: "string" }
  ],
  description: "Execute a standard JMESPath expression on data"
});

PLASMIC.registerFunction(jsonata, {
  name: "jsonata",
  params: [
    { name: "expression", type: "string" }
  ],
  description: "Create a JSONata expression"
});

PLASMIC.registerComponent(TableDataProvider, {
  name: "TableDataProvider",
  props: {
    dataSource: {
      type: "string",
      description: "The data source ID or 'offline' for local data",
      defaultValue: "offline",
    },
    queryKey: {
      type: "string",
      description: "The specific key within the data source results to display",
    },
    variableOverrides: {
      type: "object",
      description: "Overrides for query variables (as an object)",
      defaultValue: {},
    },
    // Individual Variable Props
    First: {
      type: "number",
      description: "Default value for 'First' variable",
    },
    Operator: {
      type: "string",
      description: "Default value for 'Operator' variable",
    },
    Status: {
      type: "object",
      description: "Default values for 'Status' variable (Array of strings)",
    },
    Customer: {
      type: "object",
      description: "Default values for 'Customer' variable (Array of strings)",
    },
    showSelectors: {
      type: "boolean",
      description: "Show/hide data source and query selectors",
      defaultValue: true,
    },
    hideDataSourceAndQueryKey: {
      type: "boolean",
      description: "Explicitly hide the data source and query key dropdowns even if selectors are shown",
    },
    isAdminMode: {
      type: "boolean",
      description: "Enable admin mode to bypass data filtering",
      defaultValue: false,
    },
    salesTeamColumn: {
      type: "string",
      description: "Column name for Sales Team filtering",
    },
    salesTeamValues: {
      type: "object",
      description: "Array of allowed Sales Team values",
      defaultValue: [],
    },
    hqColumn: {
      type: "string",
      description: "Column name for HQ filtering",
    },
    hqValues: {
      type: "object",
      description: "Array of allowed HQ values",
      defaultValue: [],
    },
    columnTypes: {
      type: "object",
      description: "Override column types (e.g., { fieldName: 'number' })",
      defaultValue: { is_internal_customer: "number" },
    },
    useOrchestrationLayer: {
      type: "boolean",
      description: "Enable the new orchestration layer for data processing",
      defaultValue: false,
    },
    enableSort: {
      type: "boolean",
      defaultValue: true,
      description: "Initial sort state for orchestration layer",
    },
    enableFilter: {
      type: "boolean",
      defaultValue: true,
      description: "Initial filter state for orchestration layer",
    },
    enableSummation: {
      type: "boolean",
      defaultValue: true,
      description: "Initial summation state for orchestration layer",
    },
    enableGrouping: {
      type: "boolean",
      defaultValue: true,
      description: "Initial grouping state for orchestration layer",
    },
    enableDivideBy1Lakh: {
      type: "boolean",
      defaultValue: false,
      description: "Initial divide by 1 lakh state for orchestration layer",
    },
    textFilterColumns: {
      type: "object",
      defaultValue: [],
      description: "Columns to use text search in orchestration layer",
    },
    visibleColumns: {
      type: "object",
      defaultValue: [],
      description: "Initial visible columns for orchestration layer",
    },
    redFields: {
      type: "object",
      defaultValue: [],
    },
    greenFields: {
      type: "object",
      defaultValue: [],
    },
    outerGroupField: {
      type: "string",
    },
    innerGroupField: {
      type: "string",
    },
    percentageColumns: {
      type: "object",
      defaultValue: [],
    },
    drawerTabs: {
      type: "object",
      defaultValue: [],
    },
    drawerSalesTeamColumn: {
      type: "string",
      description: "Drawer-specific column name for Sales Team filtering",
    },
    drawerSalesTeamValues: {
      type: "object",
      description: "Drawer-specific array of allowed Sales Team values",
      defaultValue: [],
    },
    drawerHqColumn: {
      type: "string",
      description: "Drawer-specific column name for HQ filtering",
    },
    drawerHqValues: {
      type: "object",
      description: "Drawer-specific array of allowed HQ values",
      defaultValue: [],
    },
    drawerVisible: {
      type: "boolean",
      defaultValue: false,
    },
    enableReport: {
      type: "boolean",
      defaultValue: false,
    },
    dateColumn: {
      type: "string",
    },
    breakdownType: {
      type: "string",
      defaultValue: "month",
    },
    onDataChange: {
      type: "eventHandler",
      argTypes: [{ name: "notification", type: "object" }],
    },
    onError: {
      type: "eventHandler",
      argTypes: [{ name: "error", type: "object" }],
    },
    onTableDataChange: {
      type: "eventHandler",
      argTypes: [{ name: "data", type: "object" }],
    },
    onRawDataChange: {
      type: "eventHandler",
      argTypes: [{ name: "data", type: "object" }],
    },
    onVariablesChange: {
      type: "eventHandler",
      argTypes: [{ name: "variables", type: "object" }],
    },
    onDataSourceChange: {
      type: "eventHandler",
      argTypes: [{ name: "dataSource", type: "string" }],
    },
    onSavedQueriesChange: {
      type: "eventHandler",
      argTypes: [{ name: "queries", type: "object" }],
    },
    onLoadingQueriesChange: {
      type: "eventHandler",
      argTypes: [{ name: "loading", type: "boolean" }],
    },
    onExecutingQueryChange: {
      type: "eventHandler",
      argTypes: [{ name: "executing", type: "boolean" }],
    },
    onAvailableQueryKeysChange: {
      type: "eventHandler",
      argTypes: [{ name: "keys", type: "object" }],
    },
    onSelectedQueryKeyChange: {
      type: "eventHandler",
      argTypes: [{ name: "key", type: "string" }],
    },
    onLoadingDataChange: {
      type: "eventHandler",
      argTypes: [{ name: "loading", type: "boolean" }],
    },
    onLastUpdatedAtChange: {
      type: "eventHandler",
      argTypes: [{ name: "timestamp", type: "string" }],
    },
    onVisibleColumnsChange: {
      type: "eventHandler",
      argTypes: [{ name: "columns", type: "object" }],
    },
    onDrawerTabsChange: {
      type: "eventHandler",
      argTypes: [{ name: "tabs", type: "object" }],
    },
    onDrawerVisibleChange: {
      type: "eventHandler",
      argTypes: [{ name: "visible", type: "boolean" }],
    },
    onColumnTypesChange: {
      type: "eventHandler",
      argTypes: [{ name: "columnTypes", type: "object" }],
    },
    onAdminModeChange: {
      type: "eventHandler",
      argTypes: [{ name: "isAdminMode", type: "boolean" }],
    },
    onEnableReportChange: {
      type: "eventHandler",
      argTypes: [{ name: "enabled", type: "boolean" }],
    },
    onDateColumnChange: {
      type: "eventHandler",
      argTypes: [{ name: "column", type: "string" }],
    },
    onBreakdownTypeChange: {
      type: "eventHandler",
      argTypes: [{ name: "type", type: "string" }],
    },
    onOuterGroupFieldChange: {
      type: "eventHandler",
      argTypes: [{ name: "field", type: "string" }],
    },
    onInnerGroupFieldChange: {
      type: "eventHandler",
      argTypes: [{ name: "field", type: "string" }],
    },
    dataSlot: {
      type: "slot",
      description: "Slot to add custom UI components that can access the table data",
    },
  },
  providesData: true,
  importPath: "./components/TableDataProvider",
});

PLASMIC.registerComponent(DataTable, {
  name: "DataTable",
  props: {
    data: {
      type: "object",
      description: "The array of data to display in the table",
    },
    queryVariables: {
      type: "object",
      description: "Base variables for the query (provided by DataProvider)",
    },
    onVariableOverridesChange: {
      type: "eventHandler",
      argTypes: [{ name: "overrides", type: "object" }],
    },
    showControls: {
      type: "boolean",
      description: "Toggle the visibility of the table controls (sort, filter, etc.)",
      defaultValue: false,
    },
    dataSource: {
      type: "string",
      description: "The data source ID or 'offline' for local data",
    },
    queryKey: {
      type: "string",
      description: "The specific key within the data source results to display",
    },
    rowsPerPageOptions: {
      type: "object",
      defaultValue: [10, 25, 50, 100],
    },
    defaultRows: {
      type: "number",
      defaultValue: 10,
    },
    scrollable: {
      type: "boolean",
      defaultValue: true,
    },
    scrollHeight: {
      type: "string",
      defaultValue: "600px",
    },
    tableName: {
      type: "string",
      defaultValue: "table",
    },
    enableSort: {
      type: "boolean",
      defaultValue: true,
      description: "Show/hide sorting controls within the header",
    },
    enableFilter: {
      type: "boolean",
      defaultValue: true,
      description: "Show/hide filtering controls within the header",
    },
    enableSummation: {
      type: "boolean",
      defaultValue: true,
      description: "Show/hide summation controls within the header",
    },
    enableGrouping: {
      type: "boolean",
      defaultValue: true,
      description: "Initial grouping state for orchestration layer",
    },
    enableDivideBy1Lakh: {
      type: "boolean",
      defaultValue: false,
      description: "Toggle dividing numerical values by 1,0,00,000 (1 Lakh)",
    },
    percentageColumns: {
      type: "object",
      description: "Configuration for percentage-based columns",
      defaultValue: [],
    },
    textFilterColumns: {
      type: "object",
      description: "Array of fields to use text search instead of multi-select",
      defaultValue: [],
    },
    visibleColumns: {
      type: "object",
      description: "Array of fields to display (empty = all)",
      defaultValue: [],
    },
    onVisibleColumnsChange: {
      type: "eventHandler",
      argTypes: [{ name: "columns", type: "object" }],
    },
    redFields: {
      type: "object",
      defaultValue: [],
    },
    greenFields: {
      type: "object",
      defaultValue: [],
    },
    outerGroupField: {
      type: "string",
      description: "Field to group by (e.g. team name)",
    },
    innerGroupField: {
      type: "string",
      description: "Field to sub-group/aggregate by",
    },
    enableCellEdit: {
      type: "boolean",
      defaultValue: false,
    },
    nonEditableColumns: {
      type: "object",
      defaultValue: [],
    },
    isAdminMode: {
      type: "boolean",
      description: "Enable admin mode to bypass data filtering",
      defaultValue: false,
    },
    salesTeamColumn: {
      type: "string",
      description: "Column name for Sales Team filtering",
    },
    salesTeamValues: {
      type: "object",
      description: "Array of allowed Sales Team values",
      defaultValue: [],
    },
    hqColumn: {
      type: "string",
      description: "Column name for HQ filtering",
    },
    hqValues: {
      type: "object",
      description: "Array of allowed HQ values",
      defaultValue: [],
    },
    enableFullscreenDialog: {
      type: "boolean",
      defaultValue: true,
      description: "Enable/disable fullscreen dialog feature",
    },
    drawerTabs: {
      type: "object",
      description: "Array of tab configurations for the detail drawer (name, outerGroup, innerGroup)",
      defaultValue: [],
    },
    enableReport: {
      type: "boolean",
      defaultValue: false,
    },
    dateColumn: {
      type: "string",
    },
    breakdownType: {
      type: "string",
      defaultValue: "month",
    },
    onDrawerTabsChange: {
      type: "eventHandler",
      argTypes: [{ name: "tabs", type: "object" }],
    },
    onEnableReportChange: {
      type: "eventHandler",
      argTypes: [{ name: "enabled", type: "boolean" }],
    },
    onDateColumnChange: {
      type: "eventHandler",
      argTypes: [{ name: "column", type: "string" }],
    },
    onBreakdownTypeChange: {
      type: "eventHandler",
      argTypes: [{ name: "type", type: "string" }],
    },
    onOuterGroupFieldChange: {
      type: "eventHandler",
      argTypes: [{ name: "field", type: "string" }],
    },
    onInnerGroupFieldChange: {
      type: "eventHandler",
      argTypes: [{ name: "field", type: "string" }],
    },
    controlsPanelSize: {
      type: "number",
      description: "The percentage width of the controls sidebar (0-100)",
      defaultValue: 20,
    },
    columnTypes: {
      type: "object",
      description: "Override column types (e.g., { fieldName: 'number' })",
      defaultValue: { is_internal_customer: "number" },
    },
    onColumnTypesChange: {
      type: "eventHandler",
      argTypes: [{ name: "columnTypes", type: "object" }],
    },
    useOrchestrationLayer: {
      type: "boolean",
      description: "Enable the new orchestration layer for data processing",
      defaultValue: false,
    },
    onSave: {
      type: "eventHandler",
      argTypes: [],
    },
    onAdminModeChange: {
      type: "eventHandler",
      argTypes: [{ name: "isAdminMode", type: "boolean" }],
    },
  },
  importPath: "./components/DataTable",
});

PLASMIC.registerComponent(DataProvider, {
  name: "DataProvider",
  props: {
    offlineData: {
      type: "object",
      description: "Offline/local data to use when dataSource is 'offline'",
    },
    dataSource: {
      type: "string",
      description: "The data source ID or 'offline' for local data",
      defaultValue: "offline",
    },
    selectedQueryKey: {
      type: "string",
      description: "The specific key within the data source results to display",
    },
    variableOverrides: {
      type: "object",
      description: "Overrides for query variables (as an object)",
      defaultValue: {},
    },
    showSelectors: {
      type: "boolean",
      description: "Show/hide data source and query selectors",
      defaultValue: true,
    },
    hideDataSourceAndQueryKey: {
      type: "boolean",
      description: "Explicitly hide the data source and query key dropdowns even if selectors are shown",
    },
    renderHeaderControls: {
      type: "boolean",
      description: "Show/hide header controls (deprecated, use showSelectors)",
      defaultValue: true,
    },
    isAdminMode: {
      type: "boolean",
      description: "Enable admin mode to bypass data filtering",
      defaultValue: false,
    },
    salesTeamColumn: {
      type: "string",
      description: "Column name for Sales Team filtering",
    },
    salesTeamValues: {
      type: "object",
      description: "Array of allowed Sales Team values",
      defaultValue: [],
    },
    hqColumn: {
      type: "string",
      description: "Column name for HQ filtering",
    },
    hqValues: {
      type: "object",
      description: "Array of allowed HQ values",
      defaultValue: [],
    },
    columnTypesOverride: {
      type: "object",
      description: "Override column types (e.g., { fieldName: 'number' })",
      defaultValue: {},
    },
    useOrchestrationLayer: {
      type: "boolean",
      description: "Enable the new orchestration layer for data processing",
      defaultValue: false,
    },
    enableSort: {
      type: "boolean",
      defaultValue: true,
      description: "Initial sort state for orchestration layer",
    },
    enableFilter: {
      type: "boolean",
      defaultValue: true,
      description: "Initial filter state for orchestration layer",
    },
    enableSummation: {
      type: "boolean",
      defaultValue: true,
      description: "Initial summation state for orchestration layer",
    },
    enableGrouping: {
      type: "boolean",
      defaultValue: true,
      description: "Initial grouping state for orchestration layer",
    },
    enableDivideBy1Lakh: {
      type: "boolean",
      defaultValue: false,
      description: "Initial divide by 1 lakh state for orchestration layer",
    },
    textFilterColumns: {
      type: "object",
      defaultValue: [],
      description: "Columns to use text search in orchestration layer",
    },
    visibleColumns: {
      type: "object",
      defaultValue: [],
      description: "Initial visible columns for orchestration layer",
    },
    redFields: {
      type: "object",
      defaultValue: [],
      description: "Array of column names to display in red",
    },
    greenFields: {
      type: "object",
      defaultValue: [],
      description: "Array of column names to display in green",
    },
    outerGroupField: {
      type: "string",
      description: "Field name for outer grouping",
    },
    innerGroupField: {
      type: "string",
      description: "Field name for inner grouping",
    },
    percentageColumns: {
      type: "object",
      defaultValue: [],
      description: "Array of percentage column configurations",
    },
    drawerTabs: {
      type: "object",
      defaultValue: [],
      description: "Array of drawer tab configurations",
    },
    enableReport: {
      type: "boolean",
      defaultValue: false,
      description: "Enable report mode with time breakdown",
    },
    dateColumn: {
      type: "string",
      description: "Column name containing date values for report breakdown",
    },
    breakdownType: {
      type: "string",
      defaultValue: "month",
      description: "Type of time breakdown: 'month', 'quarter', 'year'",
    },
    onDataChange: {
      type: "eventHandler",
      argTypes: [{ name: "notification", type: "object" }],
      description: "Callback when data changes",
    },
    onError: {
      type: "eventHandler",
      argTypes: [{ name: "error", type: "object" }],
      description: "Callback when an error occurs",
    },
    onTableDataChange: {
      type: "eventHandler",
      argTypes: [{ name: "data", type: "object" }],
      description: "Callback when table data changes",
    },
    onRawDataChange: {
      type: "eventHandler",
      argTypes: [{ name: "data", type: "object" }],
      description: "Callback when raw data changes",
    },
    onVariablesChange: {
      type: "eventHandler",
      argTypes: [{ name: "variables", type: "object" }],
      description: "Callback when query variables change",
    },
    onDataSourceChange: {
      type: "eventHandler",
      argTypes: [{ name: "dataSource", type: "string" }],
      description: "Callback when data source changes",
    },
    onSavedQueriesChange: {
      type: "eventHandler",
      argTypes: [{ name: "queries", type: "object" }],
      description: "Callback when saved queries change",
    },
    onLoadingQueriesChange: {
      type: "eventHandler",
      argTypes: [{ name: "loading", type: "boolean" }],
      description: "Callback when loading queries state changes",
    },
    onExecutingQueryChange: {
      type: "eventHandler",
      argTypes: [{ name: "executing", type: "boolean" }],
      description: "Callback when query execution state changes",
    },
    onAvailableQueryKeysChange: {
      type: "eventHandler",
      argTypes: [{ name: "keys", type: "object" }],
      description: "Callback when available query keys change",
    },
    onSelectedQueryKeyChange: {
      type: "eventHandler",
      argTypes: [{ name: "key", type: "string" }],
      description: "Callback when selected query key changes",
    },
    onLoadingDataChange: {
      type: "eventHandler",
      argTypes: [{ name: "loading", type: "boolean" }],
      description: "Callback when loading data state changes",
    },
    onVisibleColumnsChange: {
      type: "eventHandler",
      argTypes: [{ name: "columns", type: "object" }],
      description: "Callback when visible columns change",
    },
    onDrawerTabsChange: {
      type: "eventHandler",
      argTypes: [{ name: "tabs", type: "object" }],
      description: "Callback when drawer tabs change",
    },
    onBreakdownTypeChange: {
      type: "eventHandler",
      argTypes: [{ name: "type", type: "string" }],
      description: "Callback when breakdown type changes",
    },
    children: {
      type: "slot",
      description: "Slot to add custom UI components that can access the table data",
    }
  },
  providesData: true,
  importPath: "./share/datatable/components/DataProviderNew",
});

PLASMIC.registerComponent(DataTableNew, {
  name: "DataTableNew",
  props: {
    rowsPerPageOptions: {
      type: "object",
      defaultValue: [10, 25, 50, 100],
      description: "Array of rows per page options",
    },
    defaultRows: {
      type: "number",
      defaultValue: 10,
      description: "Default number of rows per page",
    },
    scrollable: {
      type: "boolean",
      defaultValue: true,
      description: "Enable/disable table scrolling",
    },
    scrollHeight: {
      type: "string",
      description: "Height of the scrollable area (e.g., '600px', 'flex' for dynamic)",
    },
    enableCellEdit: {
      type: "boolean",
      defaultValue: false,
      description: "Enable cell editing",
    },
    onCellEditComplete: {
      type: "eventHandler",
      argTypes: [
        { name: "rowData", type: "object" },
        { name: "field", type: "string" },
        { name: "newValue", type: "any" },
        { name: "oldValue", type: "any" }
      ],
      description: "Callback when cell edit is completed",
    },
    isCellEditable: {
      type: "function",
      description: "Function to determine if a cell is editable: (rowData, field) => boolean",
    },
    nonEditableColumns: {
      type: "object",
      defaultValue: [],
      description: "Array of column names that cannot be edited",
    },
    enableFullscreenDialog: {
      type: "boolean",
      defaultValue: true,
      description: "Enable/disable fullscreen dialog feature",
    },
    tableName: {
      type: "string",
      defaultValue: "table",
      description: "Name identifier for the table",
    },
    useOrchestrationLayer: {
      type: "boolean",
      defaultValue: false,
      description: "Use orchestration layer (must be child of DataProvider with useOrchestrationLayer=true)",
    },
    onOuterGroupClick: {
      type: "eventHandler",
      argTypes: [
        { name: "rowData", type: "object" },
        { name: "column", type: "string" },
        { name: "value", type: "any" }
      ],
      description: "Handler for outer group row clicks (for backward compatibility)",
    },
    onInnerGroupClick: {
      type: "eventHandler",
      argTypes: [
        { name: "rowData", type: "object" },
        { name: "column", type: "string" },
        { name: "value", type: "any" }
      ],
      description: "Handler for inner group row clicks (for backward compatibility)",
    },
  },
  importPath: "./share/datatable/components/DataTableNew",
});

PLASMIC.registerComponent(PlasmicNavigation, {
  name: "Navigation",
  props: {
    items: {
      type: "object",
      description: "JSON array of items. Use icon names (e.g., 'ChatIconActive') or image paths (e.g., '/logo.jpeg'). Each item can have 'isDisabled: true' to disable it specifically.",
      defaultValue: [
        {
          label: 'Planner',
          path: '/planner',
          mobileFullscreen: true,
          iconActive: 'PlannerIconActive',
          iconInactive: 'PlannerIconInactive',
          isDisabled: true,
        },
        {
          label: 'Doctor',
          path: '/doctor',
          iconActive: 'DoctorIconActive',
          iconInactive: 'DoctorIconInactive',
          isDisabled: true,
        },
        {
          path: '/',
          mobileOnly: true,
          isDefault: true,
          iconActive: 'HomeIcon',
          iconInactive: 'HomeIcon',
        },
        {
          label: 'Product',
          path: '/product',
          iconActive: 'ProductIconActive',
          iconInactive: 'ProductIconInactive',
        },
        {
          label: 'Desk',
          path: '/desk',
          mobileFullscreen: true,
          iconActive: 'ChatIconActive',
          iconInactive: 'ChatIconInactive',
        },
        {
          label: 'Test',
          path: '/test',
          iconActive: 'PlannerIconActive',
          iconInactive: 'PlannerIconInactive',
        },
      ],
    },
    defaultIndex: {
      type: "number",
      defaultValue: 0,
      description: "Fallback index if no URL path matches",
    },
    enableSwipe: {
      type: "boolean",
      defaultValue: true,
      description: "Enable swipe gestures on mobile to switch between pages",
    },
    hideNavigation: {
      type: "boolean",
      defaultValue: false,
      description: "Completely hide the navigation bars (sidebar and bottom bar)",
    },
    isDisabled: {
      type: "boolean",
      defaultValue: false,
      description: "Disable all navigation items (grey out and non-interactive)",
    },
    desktopWidth: {
      type: "string",
      defaultValue: "16rem",
    },
    desktopHeight: {
      type: "string",
      defaultValue: "auto",
    },
    mobileWidth: {
      type: "string",
      defaultValue: "100%",
    },
    mobileHeight: {
      type: "string",
      defaultValue: "4rem",
    },
    className: "string",
    children: {
      type: "slot",
      defaultValue: {
        type: "text",
        value: "Drop page content here",
      },
    },
  },
  importPath: "./components/PlasmicNavigation",
});
