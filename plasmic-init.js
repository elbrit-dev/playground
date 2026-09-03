import React from 'react';
import { initPlasmicLoader, DataProvider as PlasmicDataProvider } from "@plasmicapp/loader-nextjs";
// import DataTable from "./components/DataTable";
// import TableDataProvider from "./components/TableDataProvider";
import { registerElbritCoreComponents } from './share/src/plasmic-init'
import CalendarPage from "@calendar/components/CalendarPage";
import NovuInbox from "./components/NovuInbox";
import ProfileHeader from "./components/features/profile-header";
import { EVENT_TYPE_MODES, TAG_IDS, TAGS } from "@calendar/components/calendar/constants";
import NetworkBanner from "./components/NetworkBanner";
import HelpSupport from "./components/features/help-support";
import MyProfile from "./components/features/my-profile";
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
    googleClientId:{
      type: "string",
      helpText: "Google Client ID",
    },
    googleRedirectUri:{
      type: "string",
      helpText: "Google Redirect URI",
    },
    eventTypes: {
      type: "choice",
      multiSelect: true,
      options: TAGS.map((tag) => ({ label: tag.label, value: tag.id })),
      defaultValue: [TAG_IDS.LEAVE, TAG_IDS.MEETING, TAG_IDS.TODO_LIST],
      helpText:
        "Event types to apply the rule below to. Pick none and every type is enabled.",
    },
    eventTypesMode: {
      type: "choice",
      options: [
        { label: "Disabled — hide the picked types", value: EVENT_TYPE_MODES.DISABLED },
        { label: "Enabled — show only the picked types", value: EVENT_TYPE_MODES.ENABLED },
      ],
      defaultValue: EVENT_TYPE_MODES.DISABLED,
      helpText:
        "How to read the picked types. A type that ends up off is hidden from the event form, filtered off the calendar, and its data is never fetched — and with Leave off, the 'employee is on approved leave' guard on Add Event stops blocking.",
    },
  },
});

PLASMIC.registerComponent(NovuInbox, {
  name: "NovuInbox",
  props: {
    email: {
      type: "string",
      description: "User email (used as Novu subscriberId)",
    },
    firstName: {
      type: "string",
      description: "User first name (optional).",
    },
    lastName: {
      type: "string",
      description: "User last name (optional).",
    },
    phone: {
      type: "string",
      description: "User phone number in E.164 format.",
    },
    tags: {
      type: "object",
      description: "User tags (Flat object).",
    },
    meta: {
      type: "object",
      description: "Additional metadata (Flat object).",
    },
    applicationIdentifier: {
      type: "string",
      description: "Novu application identifier.",
      // Reads NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER (set per Netlify deploy context);
      // falls back to the self-hosted (notify.elbrit.org) Production env identifier.
      defaultValue: process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER || "K3rsfIP_eYvg",
    },
    subscriberHash: {
      type: "string",
      description: "Optional subscriber hash for HMAC.",
    },
    apiUrl: {
      type: "string",
      description: "Novu API base URL. Self-hosted; without it the widget hits Novu Cloud.",
      defaultValue: process.env.NEXT_PUBLIC_NOVU_BACKEND_URL || "https://api.notify.elbrit.org",
    },
    socketUrl: {
      type: "string",
      description: "Novu WebSocket URL for live inbox updates (self-hosted).",
      defaultValue: process.env.NEXT_PUBLIC_NOVU_SOCKET_URL || "https://ws.notify.elbrit.org",
    },
    className: {
      type: "string",
      description: "CSS class name for the container",
    },
    fallbackRedirectPath: {
      type: "string",
      description: "Page to open when a clicked notification has no redirect URL of its own.",
      defaultValue: "/chat",
    },
    bellSize: {
      type: "number",
      description: "Size (px) of the notification bell icon.",
      defaultValue: 28,
    },
    bellPadding: {
      type: "string",
      description: "Padding around the bell trigger button (any CSS length, e.g. '0', '2px'). Smaller = less background space around the bell.",
      defaultValue: "2px",
    },
    promptGateKey: {
      type: "string",
      defaultValue: "token",
      description:
        "The automatic notification-permission popup at page open only appears when this localStorage key holds a non-empty value (i.e. the user is logged in). Leave empty to always prompt. The Push Notification Toggle is never gated by this.",
    },
    onNotificationClick: {
      type: "eventHandler",
      argTypes: [
        { name: "notification", type: "object" }
      ],
      description: "Called when a notification (body) is clicked. The notification's own redirect URL still navigates automatically.",
    },
    onPrimaryActionClick: {
      type: "eventHandler",
      argTypes: [
        { name: "notification", type: "object" }
      ],
      description: "Callback function called when primary action button is clicked",
    },
    onSecondaryActionClick: {
      type: "eventHandler",
      argTypes: [
        { name: "notification", type: "object" }
      ],
      description: "Callback function called when secondary action button is clicked",
    },
  },
  importPath: "./components/NovuInbox",
});

PLASMIC.registerComponent(NetworkBanner, {
  name: "NetworkBanner",
  displayName: "Network Banner",
  description:
    "Auto-showing toast that floats in a corner when the network is slow or offline, and hides itself (taking no layout space) when the connection is good. Because it is position:fixed, it can be dropped anywhere on the page/layout.",
  props: {
    position: {
      type: "choice",
      options: ["top", "bottom"],
      defaultValue: "top",
      description: "Pin the toast to the top-right or bottom-right corner of the viewport.",
    },
    showWhenFast: {
      type: "boolean",
      defaultValue: false,
      description: "Also show a green banner when the connection is fast.",
    },
    forceShow: {
      type: "boolean",
      defaultValue: false,
      description:
        "Editor preview only: force the banner to render so you can see/style it on the canvas.",
    },
    demoSeverity: {
      type: "choice",
      options: ["red", "orange", "yellow", "green"],
      description:
        "Editor preview only: render a specific state (offline/slow/etc.) on the canvas.",
    },
  },
  importPath: "./components/NetworkBanner",
});
PLASMIC.registerComponent(ProfileHeader, {
  name: "ProfileHeader",
  displayName: "ProfileHeader",
  description:
    "Page header for the profile screen: title on the left, an actions slot for the notification bell on the right, then the company logo.",
  props: {
    title: {
      type: "string",
      displayName: "Title",
      defaultValue: "My profile",
    },
    subtitle: {
      type: "string",
      displayName: "Subtitle",
      description: "Optional small line under the title. Leave empty and nothing renders.",
    },
    actions: {
      type: "slot",
      displayName: "Bell / actions",
      description:
        "Sits to the left of the logo - drop NovuInbox here for the notification bell. Any number of icons can go in; they lay out in a row.",
      defaultValue: [{ type: "component", name: "NovuInbox" }],
    },
    logoUrl: {
      type: "imageUrl",
      displayName: "Logo",
      description: "Shown at the far right. Leave empty and the logo (and its divider) are dropped.",
    },
    logoAlt: {
      type: "string",
      displayName: "Logo alt text",
      defaultValue: "Company logo",
    },
    logoHeight: {
      type: "number",
      displayName: "Logo height",
      defaultValue: 28,
      description: "Height in px. Width follows the image's aspect ratio.",
    },
    logoHref: {
      type: "string",
      displayName: "Logo link",
      description: "Optional - makes the logo a link that opens in a new tab.",
    },
    sticky: {
      type: "boolean",
      displayName: "Stick to top",
      defaultValue: false,
      description: "Keeps the header visible while the page scrolls.",
    },
    bordered: {
      type: "boolean",
      displayName: "Bottom border",
      defaultValue: true,
    },
    className: { type: "string", description: "CSS class on the header element." },
  },
  styleSections: true,
  importPath: "./components/features/profile-header",
});
PLASMIC.registerComponent(HelpSupport, {
  name: "HelpSupport",
  displayName: "Help Support",
  description: "Help desk dashboard, knowledge base, and HD ticket creation flow.",
  props: {
    url: {
      type: "string",
      displayName: "GraphQL URL",
      description: "ERP GraphQL URL, for example https://uat.elbrit.org/api/method/graphql.",
    },
    token: {
      type: "string",
      displayName: "Auth token",
      description: "ERP token header value, for example token key:secret.",
    },
    className: {
      type: "string",
      displayName: "className",
      description:
        "Applied to the root element so width, height, and spacing can be set from Studio. Setting it replaces the built-in full-height sizing, so set a height here too.",
      defaultValue: "",
    },
  },
  styleSections: true,
  importPath: "./components/features/help-support",
});
PLASMIC.registerComponent(MyProfile, {
  name: "MyProfile",
  displayName: "MyProfile",
  description:
    "Employee profile: personal info, role details, account details, documents and payslips, with PDF export. Every field is read-only except the profile picture, which writes back to the ERP.",
  props: {
    profile: {
      type: "object",
      displayName: "Profile",
      description:
        "Company, employee identity and the read-only field sections. Shape: { company, employee, syncText, personalInfo: { overviewNote, overview[], contactNote, contact[] }, roleDetails: { reportingNote, reporting[] }, accountDetails: { salaryNote, salary[], statutoryNote, statutory[], insuranceNote, insuranceCoverage, insurance[] } }. Every field list is an array of { label, value, copy?, reveal?, maskedValue? }. `employee` also drives the avatar: { imageUrl, userId, id } - `imageUrl` is the current picture (User.user_image, absolute or /files/…), `userId` is the ERP User id that a new picture is saved onto (Employee.user_id; falls back to the Company email row, then the button disables), and `id` is the Employee docname the picture is mirrored to (falls back to employeeCode).",
    },
    leaveBalance: {
      type: "object",
      displayName: "Leave balance",
      description:
        "Leave balance card. Shape: { note, items: [{ label, value, caption, strong? }] }.",
    },
    payslips: {
      type: "object",
      displayName: "Payslips",
      description:
        "Salary Slip data. Shape: { summary[], fiscalYears[], slips: [{ month, period, gross, deductions, netPay, status }], selectedSlip: { title, subtitle, netPay, creditText, earnings[], grossPay, deductions[], totalDeductions, meta[], incomeTaxSlab?, taxSummary?[], incomeTaxSummary?[] } }. Earnings/deductions rows accept an optional `ytd` for the Year To Date column.",
    },
    documents: {
      type: "object",
      displayName: "Documents",
      description:
        "Documents tab. Shape: { note, items: [{ name, issued, format, size, url? }] }. Give an item a `url` and its download serves that file instead of a generated record sheet.",
    },
    defaultTab: {
      type: "choice",
      displayName: "Default tab",
      options: ["personal", "role", "account", "documents", "payslips"],
      defaultValue: "personal",
    },
    helpDeskLink: {
      type: "string",
      displayName: "Help desk link",
      description: "URL for the \"Open Help desk\" link in the desktop header. Left empty, it renders as plain non-interactive text.",
    },
    erpBaseUrl: {
      type: "string",
      displayName: "ERP base URL",
      description:
        "Only needed when profile.employee.imageUrl is a relative ERP path such as /files/avatar.jpg - it is resolved against this origin, for example https://uat.elbrit.org. A picture saved from here always comes back absolute.",
    },
    erpEndpointKey: {
      type: "string",
      displayName: "ERP endpoint key",
      description:
        "Leave this empty unless more than one ERP is configured. It names which one a new picture is written to, and it is only the {KEY} half of NEXT_PUBLIC_GRAPHQL_ENDPOINT_{KEY} - \"UAT\", not the whole variable name. Empty means the server picks NEXT_PUBLIC_GRAPHQL_DEFAULT_ENDPOINT, or the only endpoint it finds.",
    },
    onPictureChange: {
      type: "eventHandler",
      displayName: "On picture change",
      description: "Fires after a new profile picture is saved to the ERP. Use it to refetch the profile query.",
      argTypes: [{ name: "imageUrl", type: "string" }],
    },
  },
  styleSections: true,
  importPath: "./components/features/my-profile",
});
registerElbritCoreComponents(PLASMIC)

// PLASMIC.registerComponent(DataProvider, {
//   name: "DataProvider",
//   props: {
//     config: {
//       type: "object",
//       description: "Main configuration object. Use when passing config directly. When presetDataSource and presetName are set, config is ignored and the preset is loaded from Firebase instead.",
//     },
//     presetDataSource: {
//       type: "string",
//       description: "Firebase data source / query ID (e.g. 'Primary'). When set with presetName, loads config from Firebase instead of using config prop.",
//     },
//     presetName: {
//       type: "string",
//       description: "Name of the preset to load from Firebase. When set with presetDataSource, loads config from Firebase instead of using config prop.",
//     },
//     offlineData: {
//       type: "object",
//       description: "Offline/local data to use when dataSource is 'offline'",
//     },
//     onDataChange: {
//       type: "eventHandler",
//       argTypes: [{ name: "notification", type: "object" }],
//       description: "Callback when data changes",
//     },
//     onError: {
//       type: "eventHandler",
//       argTypes: [{ name: "error", type: "object" }],
//       description: "Callback when an error occurs",
//     },
//     overrides: {
//       type: 'object',
//       displayName: 'overrides',
//       description: 'Optional { variables, token } for GraphQL variables and Authorization override.',
//     },
//     __internal: {
//       type: "object",
//       description: "Internal/plumbing props for nested and drawer table scenarios. Keys: skipConfirmDialog (boolean), showProviderHeader (boolean), reportDataOverride (object), forceBreakdown (boolean), parentColumnName (string), nestedTableFieldName (string), forceEnableWrite (boolean), derivedColumnsMode (string), derivedColumnsFieldName (string), parentOriginalNestedTableDataRef (object), parentNestedTableEditingDataRef (object), parentHandleDrawerSaveProp (function), nestedTableTabId (string), fallbackColumns (object), onNestedBufferChange (function), parentHandleAddNestedRowAtZero (function), visibleColumns (object), onTableDataChange (function), onAllowedColumnsChange (function), onVisibleColumnsChange (function).",
//       defaultValue: {},
//     },
//     children: {
//       type: "slot",
//       description: "Slot to add custom UI components that can access the table data",
//     }
//   },
//   providesData: true,
//   importPath: "./share/src/app/datatable/components/DataProvider",
// });
 
// PLASMIC.registerComponent(DataTableNew, {
//   name: "DataTableNew",
//   props: {
//     slotId: {
//       type: "string",
//       description: "Slot ID to select which slot's data to use (defaults to 'main' if not provided)",
//     },
//     tableName: {
//       type: "string",
//       defaultValue: "table",
//       description: "Name identifier for the table",
//     },
//     onCellEditComplete: {
//       type: "eventHandler",
//       argTypes: [
//         { name: "rowData", type: "object" },
//         { name: "field", type: "string" },
//         { name: "newValue", type: "any" },
//         { name: "oldValue", type: "any" }
//       ],
//       description: "Callback when cell edit is completed",
//     },
//     isCellEditable: {
//       type: "function",
//       description: "Function to determine if a cell is editable: (rowData, field) => boolean",
//     },
//   },
//   importPath: "./share/src/app/datatable/components/DataTableNew",
// });
 

// PLASMIC.registerComponent(Navigation, {
//   name: "Navigation",
//   props: {
//     items: {
//       type: "object",
//       description: "JSON array of navigation items. Each item should have: label (string), path (string), iconActive (JSX element), iconInactive (JSX element), mobileFullscreen (boolean), mobileOnly (boolean), isDefault (boolean), isDisabled (boolean). Icons must be JSX elements, not strings.",
//       defaultValue: [],
//     },
//     defaultIndex: {
//       type: "number",
//       defaultValue: 0,
//       description: "Fallback index if no URL path matches and no item has isDefault: true",
//     },
//     desktopWidth: {
//       type: "string",
//       defaultValue: "16rem",
//       description: "Width of the desktop sidebar navigation",
//     },
//     desktopHeight: {
//       type: "string",
//       defaultValue: "93dvh",
//       description: "Height of the desktop sidebar navigation",
//     },
//     mobileWidth: {
//       type: "string",
//       defaultValue: "100%",
//       description: "Width of the mobile bottom navigation",
//     },
//     mobileHeight: {
//       type: "string",
//       defaultValue: "4rem",
//       description: "Height of the mobile bottom navigation",
//     },
//     showCollapse: {
//       type: "boolean",
//       defaultValue: true,
//       description: "Show/hide the collapse button in desktop sidebar",
//     },
//   },
//   importPath: "./share/src/app/navigation/components/Navigation",
// });

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
