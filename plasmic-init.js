import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import DataTable from "./components/DataTable";
import TableDataProvider from "./components/TableDataProvider";
import PlasmicNavigation from "./components/PlasmicNavigation";
// import GraphQLPlaygroundCard from "./components/GraphQLPlaygroundCard";

// import FirebaseUIComponent from "./components/FirebaseUIComponent";


export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "cwnJgvdnQpoepoZBvr68ae",
      token: "BdNuIur9T6Ip7PFDZvUFPN9Up4YDdzbVPkJ9WjUspBE49F7rQ9f7T6mqnnZ5U3iTKzvM9x99uXVbT6A"
    }
  ],
  preview: true,
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
    onDataChange: {
      type: "eventHandler",
      argTypes: [{ name: "notification", type: "object" }],
    },
    onTableDataChange: {
      type: "eventHandler",
      argTypes: [{ name: "data", type: "object" }],
    },
  },
  importPath: "./components/TableDataProvider",
});

PLASMIC.registerComponent(DataTable, {
  name: "DataTable",
  props: {
    data: {
      type: "object",
      description: "The array of data to display in the table",
      defaultValue: [],
    },
    queryVariables: {
      type: "object",
      description: "Base variables for the query (provided by DataProvider)",
      defaultValue: {},
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
      defaultValue: "offline",
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
    enableTargetData: {
      type: "boolean",
      defaultValue: false,
      description: "Enable target vs actual comparison",
    },
    targetData: {
      type: "object",
      description: "The array of target data to compare against",
      defaultValue: [],
    },
    targetOuterGroupField: {
      type: "string",
      description: "The field in target data that corresponds to the outer group",
    },
    targetInnerGroupField: {
      type: "string",
      description: "The field in target data that corresponds to the inner group",
    },
    targetValueField: {
      type: "string",
      description: "The field in target data that contains the target value",
    },
    actualValueField: {
      type: "string",
      description: "The field in the main data that contains the actual value",
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
    controlsPanelSize: {
      type: "number",
      description: "The percentage width of the controls sidebar (0-100)",
      defaultValue: 20,
    },
    onSave: {
      type: "eventHandler",
      argTypes: [],
    },
  },
  importPath: "./components/DataTable",
});

PLASMIC.registerComponent(PlasmicNavigation, {
  name: "Navigation",
  props: {
    items: {
      type: "object",
      description: "JSON array of items. Use icon names (e.g., 'ChatIconActive') or image paths (e.g., '/logo.jpeg')",
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

/*
PLASMIC.registerComponent(GraphQLPlaygroundCard, {
  name: "GraphQLPlaygroundCard",
  props: {
    title: {
      type: "string",
      defaultValue: "GraphQL Playground",
    },
    description: {
      type: "string",
      defaultValue: "Explore GraphQL APIs with GraphiQL and the Explorer plugin",
    }
  },
  importPath: "./components/GraphQLPlaygroundCard",
});

PLASMIC.registerComponent(FirebaseUIComponent, {
  name: "FirebaseUIComponent",
  description: "Native Firebase Authentication UI (Microsoft & Phone)",
  isDefaultExport: true,
  importPath: "./components/FirebaseUIComponent",
  props: {
    className: {
      type: "string",
    },
    onSuccess: {
      type: "eventHandler",
      argTypes: [{ name: "data", type: "object" }],
    },
    onError: {
      type: "eventHandler",
      argTypes: [{ name: "error", type: "object" }],
    },
  },
})
*/
