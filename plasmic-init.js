import { initPlasmicLoader } from "@plasmicapp/loader-nextjs";
import DataTable from "./components/DataTable";
import GraphQLPlaygroundCard from "./components/GraphQLPlaygroundCard";

export const PLASMIC = initPlasmicLoader({
  projects: [
    {
      id: "cwnJgvdnQpoepoZBvr68ae",
      token: "BdNuIur9T6Ip7PFDZvUFPN9Up4YDdzbVPkJ9WjUspBE49F7rQ9f7T6mqnnZ5U3iTKzvM9x99uXVbT6A"
    }
  ],
  preview: true,
});

PLASMIC.registerComponent(DataTable, {
  name: "DataTable",
  props: {
    data: {
      type: "object",
      description: "The array of data to display in the table",
      defaultValue: [],
    },
    showControls: {
      type: "boolean",
      description: "Toggle the visibility of the table controls (sort, filter, etc.)",
      defaultValue: true,
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
  },
  importPath: "./components/DataTable",
});

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
