import React from 'react';
import { initPlasmicLoader, DataProvider as PlasmicDataProvider } from "@plasmicapp/loader-nextjs";
// import DataTable from "./components/DataTable";
// import TableDataProvider from "./components/TableDataProvider";
import DataProvider from "./share/src/app/datatable/components/DataProviderNew";
import DataTableNew from "./share/src/app/datatable/components/DataTableNew";
import Navigation from "./share/src/app/navigation/components/Navigation";
import CalendarPage from "@calendar/components/CalendarPage";
// import NovuInbox from "./components/NovuInbox";
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

PLASMIC.registerComponent(CalendarPage, {
  name: "CalendarPage",
  props: {
    erpUrl: {
      type: "string",
      helpText: "ERP GraphQL endpoint",
    },
    authToken: {
      type: "string",
      helpText: "User auth token",
    },
    homeUrl: {
      type: "string",
      defaultValue: "/",
      helpText: "Redirect if not logged in",
    },
    me: {
      type: "object",
      helpText: "Result of GraphQL `me` query",
    },
  },
});

PLASMIC.registerComponent(DataProvider, {
  name: "DataProvider",
  props: {
    config: {
      type: "object",
      description: "Main configuration object. Use when passing config directly. When presetDataSource and presetName are set, config is ignored and the preset is loaded from Firebase instead.",
    },
    presetDataSource: {
      type: "string",
      description: "Firebase data source / query ID (e.g. 'Primary'). When set with presetName, loads config from Firebase instead of using config prop.",
    },
    presetName: {
      type: "string",
      description: "Name of the preset to load from Firebase. When set with presetDataSource, loads config from Firebase instead of using config prop.",
    },
    offlineData: {
      type: "object",
      description: "Offline/local data to use when dataSource is 'offline'",
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
    __internal: {
      type: "object",
      description: "Internal/plumbing props for nested and drawer table scenarios. Keys: skipConfirmDialog (boolean), showProviderHeader (boolean), reportDataOverride (object), forceBreakdown (boolean), parentColumnName (string), nestedTableFieldName (string), forceEnableWrite (boolean), derivedColumnsMode (string), derivedColumnsFieldName (string), parentOriginalNestedTableDataRef (object), parentNestedTableEditingDataRef (object), parentHandleDrawerSaveProp (function), nestedTableTabId (string), fallbackColumns (object), onNestedBufferChange (function), parentHandleAddNestedRowAtZero (function), visibleColumns (object), onTableDataChange (function), onAllowedColumnsChange (function), onVisibleColumnsChange (function).",
      defaultValue: {},
    },
    children: {
      type: "slot",
      description: "Slot to add custom UI components that can access the table data",
    }
  },
  providesData: true,
  importPath: "./share/src/app/datatable/components/DataProvider",
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
    editableColumns: {
      type: "object",
      defaultValue: { main: [], nested: {} },
      description: "Object defining editable columns. Format: { main: ['col1', 'col2'], nested: { parentCol: { nestedField: ['col1'] } } }. Empty main array means all columns editable. For nested tables, specify parent column and nested field name.",
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
    parentColumnName: {
      type: "string",
      description: "Parent column name for nested tables (used with nestedTableFieldName)",
    },
    nestedTableFieldName: {
      type: "string",
      description: "Nested table field name (used with parentColumnName for nested drawer tables)",
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
    slotId: {
      type: "string",
      description: "Slot ID to select which slot's data to use (defaults to 'main' if not provided)",
    },
  },
  importPath: "./share/src/app/datatable/components/DataTableNew",
});

PLASMIC.registerComponent(Navigation, {
  name: "Navigation",
  props: {
    items: {
      type: "object",
      description: "JSON array of navigation items. Each item should have: label (string), path (string), iconActive (JSX element), iconInactive (JSX element), mobileFullscreen (boolean), mobileOnly (boolean), isDefault (boolean), isDisabled (boolean). Icons must be JSX elements, not strings.",
      defaultValue: [],
    },
    defaultIndex: {
      type: "number",
      defaultValue: 0,
      description: "Fallback index if no URL path matches and no item has isDefault: true",
    },
    desktopWidth: {
      type: "string",
      defaultValue: "16rem",
      description: "Width of the desktop sidebar navigation",
    },
    desktopHeight: {
      type: "string",
      defaultValue: "93dvh",
      description: "Height of the desktop sidebar navigation",
    },
    mobileWidth: {
      type: "string",
      defaultValue: "100%",
      description: "Width of the mobile bottom navigation",
    },
    mobileHeight: {
      type: "string",
      defaultValue: "4rem",
      description: "Height of the mobile bottom navigation",
    },
    showCollapse: {
      type: "boolean",
      defaultValue: true,
      description: "Show/hide the collapse button in desktop sidebar",
    },
  },
  importPath: "./share/src/app/navigation/components/Navigation",
});

// PLASMIC.registerComponent(NovuInbox, {
//   name: "NovuInbox",
//   props: {
//     subscriberId: {
//       type: "string",
//       description: "Novu subscriber ID (user identifier). If not provided, will use 'employeeid' from localStorage, then fall back to NEXT_PUBLIC_NOVU_SUBSCRIBER_ID from environment variables.",
//     },
//     applicationIdentifier: {
//       type: "string",
//       description: "Novu application identifier. If not provided, will use NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER from environment variables.",
//     },
//     subscriberHash: {
//       type: "string",
//       description: "Optional subscriber hash for HMAC authentication (only needed if using HMAC). If not provided, will use NEXT_PUBLIC_NOVU_SUBSCRIBER_HASH from environment variables. Can be left empty if not using HMAC.",
//     },
//     email: {
//       type: "string",
//       description: "User email address (optional). Will be added to OneSignal user profile.",
//     },
//     phone: {
//       type: "string",
//       description: "User phone number in E.164 format, e.g., +91XXXXXXXXXX (optional). Will be added to OneSignal user profile.",
//     },
//     tags: {
//       type: "object",
//       description: "User tags as key-value pairs (optional). Flat object only, no nested objects. Example: { role: 'admin', division: 'sales' }",
//     },
//     className: {
//       type: "string",
//       description: "CSS class name for the container",
//     },
//   },
//   importPath: "./components/NovuInbox",
// });